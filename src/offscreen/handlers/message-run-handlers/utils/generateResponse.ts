import type { RegisteredToolDefinition } from "@/offscreen/tools/types"
import type { Chat, MessageAssistant, MessageRun } from "@/shared/api"

import {
  type ChatMessage,
  type ChatToolCall,
  type ChatToolDefinition,
  createModelAdapter,
} from "@/offscreen/models"
import {
  getAllCommands,
  getChatById,
  getMaxRequestPerMinute,
  getMessageRunById,
  getMessageRunsByChat,
  type ModelProvider,
  updateMessageRun,
} from "@/offscreen/storage"
import {
  executeInteractiveToolCalls,
  executeToolCalls,
  getEnabledTools,
  isInteractiveTool,
} from "@/offscreen/tools/runtime"
import {
  builtinCommands,
  continuationAnswerContinue,
  continuationPromptMessage,
} from "@/shared/const"

import {
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry"
import { waitForMessageRunAnswer } from "./await-registry"
import {
  buildConversationHistory,
  toConversationMessages,
} from "./chat-history"
import { notifySidepanel } from "./notifySidepanel"
import { RateLimiter } from "./rate-limiter"

export async function generateResponse(
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
  modelName: string,
  provider: ModelProvider,
) {
  const abortController = new AbortController()
  const signal = registerAbortController(messageRunId, abortController)

  try {
    const messageRun = await getMessageRunById(messageRunId)
    if (!messageRun) {
      throw new Error("Message run not found")
    }

    const chat = await getChatById(chatId)
    if (!chat) {
      throw new Error("Chat not found")
    }

    // If the run was stopped before generation started, exit early.
    if (signal.aborted) {
      messageRun.status = "stopped"
      await persistMessageRunUpdate(chatId, messageRun)
      return
    }

    // Update status to running
    messageRun.status = "running"
    await persistMessageRunUpdate(chatId, messageRun)

    const adapter = createModelAdapter(provider, modelName)
    const enabledTools = await getEnabledTools(chat)
    const conversationMessages = buildConversationHistory(
      await getMessageRunsByChat(chatId),
      chat,
      [...builtinCommands, ...(await getAllCommands())],
    )

    const rateLimiter = new RateLimiter(getMaxRequestPerMinute(provider))

    while (true) {
      // Stop iterating tool round trips if the user aborted the run.
      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(chatId, messageRun)
        return
      }

      // When the model reaches the per-minute request limit, pause and ask
      // the user whether to keep going instead of failing. If they continue,
      // the window resets for another full batch of requests; if they stop,
      // the run is marked as stopped.
      if (rateLimiter.isLimitReached()) {
        const shouldContinue = await requestContinuation(
          messageRun,
          chatId,
          signal,
        )

        if (shouldContinue) {
          rateLimiter.reset()
        } else {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(chatId, messageRun)
          return
        }
      }

      const { assistantMessage, toolCalls } = await streamAssistantResponse(
        adapter,
        chatId,
        conversationMessages,
        messageRun,
        enabledTools,
        signal,
      )

      if (toolCalls.length === 0) {
        messageRun.status = "completed"
        await persistMessageRunUpdate(chatId, messageRun)
        return
      }

      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(chatId, messageRun)
        return
      }

      const interactiveCalls = toolCalls.filter((toolCall) =>
        isInteractiveTool(toolCall.name),
      )
      const nonInteractiveCalls = toolCalls.filter(
        (toolCall) => !isInteractiveTool(toolCall.name),
      )

      let interactiveResult: null | {
        conversationMessages: ChatMessage[]
        shouldStop: boolean
      } = null

      if (interactiveCalls.length > 0) {
        interactiveResult = await executeInteractiveToolCalls(
          interactiveCalls,
          assistantMessage,
          messageRun,
          chatId,
          signal,
          persistMessageRunUpdate,
        )

        if (interactiveResult.shouldStop || signal.aborted) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(chatId, messageRun)
          return
        }
      }

      if (nonInteractiveCalls.length > 0) {
        const toolResults =
          (await executeToolCalls(nonInteractiveCalls, enabledTools, chatId)) ??
          []

        assistantMessage.tools.push(...toolResults)
      }

      await persistMessageRunUpdate(chatId, messageRun)

      conversationMessages.push(...toConversationMessages(assistantMessage))

      if (interactiveResult) {
        conversationMessages.push(...interactiveResult.conversationMessages)
      }

      rateLimiter.recordRequest()
    }
  } catch (error) {
    const messageRun = await getMessageRunById(messageRunId)

    if (messageRun) {
      if (signal.aborted || isAbortError(error)) {
        messageRun.status = "stopped"
        messageRun.error = null
      } else {
        messageRun.status = "failed"
        messageRun.error =
          error instanceof Error ? error.message : "Unknown error"
      }

      await persistMessageRunUpdate(chatId, messageRun)
    }
  } finally {
    unregisterAbortController(messageRunId)
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "AbortError" || /aborted/i.test(error.message)
  }
  return false
}

/**
 * Pauses generation when the assistant reaches the provider's per-minute
 * request limit and asks the user whether to continue. Sets the run status to
 * `awaiting_input` and surfaces a {@link ContinuationPrompt} on the run so the
 * sidepanel can render a confirm/stop UI. Resolves `true` when the user
 * chooses to continue (resetting the rate-limit window) and `false` when they
 * stop or abort.
 *
 * Reuses the same answer registry as `ask_followup_question` so the existing
 * `chatMessageRunAnswer` action drives the resume.
 */
async function requestContinuation(
  messageRun: MessageRun,
  chatId: Chat["id"],
  signal: AbortSignal,
): Promise<boolean> {
  messageRun.continuationPrompt = { message: continuationPromptMessage }
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(chatId, messageRun)

  let answer: string
  try {
    answer = await waitForMessageRunAnswer(messageRun.id)
  } catch {
    // The run was stopped (or deleted) while waiting for confirmation.
    messageRun.continuationPrompt = null
    return false
  }

  // Clear the prompt regardless of the outcome.
  messageRun.continuationPrompt = null

  if (signal.aborted) {
    return false
  }

  if (answer.trim().toLowerCase() === continuationAnswerContinue) {
    messageRun.status = "running"
    await persistMessageRunUpdate(chatId, messageRun)
    return true
  }

  return false
}

async function streamAssistantResponse(
  adapter: ReturnType<typeof createModelAdapter>,
  chatId: Chat["id"],
  conversationMessages: ChatMessage[],
  messageRun: MessageRun,
  toolDefinitions: RegisteredToolDefinition[],
  signal: AbortSignal,
): Promise<{ assistantMessage: MessageAssistant; toolCalls: ChatToolCall[] }> {
  const assistantMessage: MessageAssistant = {
    content: "",
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    messageRunId: messageRun.id,
    role: "assistant",
    tools: [],
  }

  const config = {
    ...(toolDefinitions.length > 0
      ? {
          tools: toolDefinitions.map((tool): ChatToolDefinition => ({
            description: tool.definition.description,
            inputSchema: tool.inputSchema,
            name: tool.definition.name,
          })),
        }
      : {}),
    signal,
  }
  let toolCalls: ChatToolCall[] = []

  messageRun.assistantMessages.push(assistantMessage)

  for await (const chunk of adapter.chat(conversationMessages, config)) {
    if (chunk.content) {
      assistantMessage.content += chunk.content
    }

    if (chunk.thoughts) {
      assistantMessage.thoughts =
        (assistantMessage.thoughts ?? "") + chunk.thoughts
    }

    if (chunk.usage?.completionTokens !== undefined) {
      assistantMessage.tokenCount = chunk.usage.completionTokens
    }

    if (
      messageRun.assistantMessages[0]?.id === assistantMessage.id &&
      chunk.usage?.promptTokens !== undefined
    ) {
      messageRun.userMessage.tokenCount = chunk.usage.promptTokens
    }

    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls
    }

    await persistMessageRunUpdate(chatId, messageRun)

    if (chunk.done) {
      break
    }
  }

  return { assistantMessage, toolCalls }
}

async function persistMessageRunUpdate(
  chatId: Chat["id"],
  messageRun: MessageRun,
) {
  messageRun.updatedAt = Date.now()
  await updateMessageRun(messageRun)
  notifySidepanel(chatId, messageRun.id)
}
