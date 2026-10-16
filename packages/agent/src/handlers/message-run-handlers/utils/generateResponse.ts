import type {
  Chat,
  FollowupQuestion,
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
  MessageUserAnswer,
  ModelRunSettings,
} from "@pilot43/protocol"

import {
  builtinCommands,
  continuationAnswerContinue,
  continuationPromptMessage,
} from "@pilot43/protocol"

import type { AgentContext } from "../../../context"
import type { RegisteredToolDefinition } from "../../../tools/types"

import {
  type ChatMessage,
  type ChatToolCall,
  type ChatToolDefinition,
  createModelAdapter,
} from "../../../models"
import { getMaxRequestPerMinute, type ModelProvider } from "../../../storage"
import { MessageRunStoppedError } from "../../../tools/errors"
import { executeToolCalls, getEnabledTools } from "../../../tools/runtime"
import {
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry"
import { waitForMessageRunAnswer } from "./await-registry"
import {
  buildConversationHistory,
  toConversationMessages,
} from "./chat-history"
import { notifyMessageRunUpdated } from "./notify"
import { RateLimiter } from "./rate-limiter"

export async function generateResponse(
  ctx: AgentContext,
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
  modelName: string,
  provider: ModelProvider,
  modelSettings: ModelRunSettings = {},
) {
  const abortController = new AbortController()
  const signal = registerAbortController(messageRunId, abortController)

  try {
    const messageRun = await ctx.store.getMessageRunById(messageRunId)
    if (!messageRun) {
      throw new Error("Message run not found")
    }

    const chat = await ctx.store.getChatById(chatId)
    if (!chat) {
      throw new Error("Chat not found")
    }

    // If the run was stopped before generation started, exit early.
    if (signal.aborted) {
      messageRun.status = "stopped"
      await persistMessageRunUpdate(ctx, chatId, messageRun)
      return
    }

    // Update status to running
    messageRun.status = "running"
    await persistMessageRunUpdate(ctx, chatId, messageRun)

    const adapter = createModelAdapter(provider, modelName)
    const enabledTools = await getEnabledTools(chat, ctx.toolset, {
      store: ctx.store,
    })
    const conversationMessages = buildConversationHistory(
      ctx.systemPrompt(),
      await ctx.store.getMessageRunsByChat(chatId),
      chat,
      [...builtinCommands, ...(await ctx.store.getAllCommands())],
    )

    const rateLimiter = new RateLimiter(getMaxRequestPerMinute(provider))

    while (true) {
      // Stop iterating tool round trips if the user aborted the run.
      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      // When the model reaches the per-minute request limit, pause and ask
      // the user whether to keep going instead of failing. If they continue,
      // the window resets for another full batch of requests; if they stop,
      // the run is marked as stopped.
      if (rateLimiter.isLimitReached()) {
        const shouldContinue = await requestContinuation(
          ctx,
          messageRun,
          chatId,
          signal,
        )

        if (shouldContinue) {
          rateLimiter.reset()
        } else {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(ctx, chatId, messageRun)
          return
        }
      }

      const { assistantMessage, toolCalls } = await streamAssistantResponse(
        ctx,
        adapter,
        chatId,
        conversationMessages,
        messageRun,
        enabledTools,
        modelSettings,
        signal,
      )

      if (toolCalls.length === 0) {
        messageRun.status = "completed"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      // Answers the user gives to tools during this round trip. They follow
      // the assistant message and its tool results in the conversation.
      const userAnswers: ChatMessage[] = []

      const { stopped } = await executeToolCalls(
        toolCalls,
        enabledTools,
        assistantMessage,
        {
          askUser: createAskUser({
            assistantMessage,
            chatId,
            ctx,
            messageRun,
            signal,
            userAnswers,
          }),
          chatId,
          messageRunId,
          policy: ctx.toolset.policy,
          store: ctx.store,
          signal,
        },
      )

      if (stopped) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      await persistMessageRunUpdate(ctx, chatId, messageRun)

      conversationMessages.push(
        ...toConversationMessages(assistantMessage),
        ...userAnswers,
      )

      rateLimiter.recordRequest()
    }
  } catch (error) {
    const messageRun = await ctx.store.getMessageRunById(messageRunId)

    if (messageRun) {
      if (signal.aborted || isAbortError(error)) {
        messageRun.status = "stopped"
        messageRun.error = null
      } else {
        messageRun.status = "failed"
        messageRun.error =
          error instanceof Error ? error.message : "Unknown error"
      }

      await persistMessageRunUpdate(ctx, chatId, messageRun)
    }
  } finally {
    unregisterAbortController(messageRunId, abortController)
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "AbortError" || /aborted/i.test(error.message)
  }
  return false
}

interface AskUserOptions {
  assistantMessage: MessageAssistant
  chatId: Chat["id"]
  ctx: AgentContext
  messageRun: MessageRun
  signal: AbortSignal
  userAnswers: ChatMessage[]
}

/**
 * Implements `ToolContext.askUser` for the tool calls of one round trip.
 * Questions are asked one at a time so concurrent tools never overwrite each
 * other's pending question.
 */
function createAskUser(
  options: AskUserOptions,
): (
  entry: MessageAssistantTool,
  question: FollowupQuestion,
) => Promise<string> {
  let queue: Promise<unknown> = Promise.resolve()

  return (entry, question) => {
    const answer = queue.then(() => askUser(options, entry, question))
    queue = answer.catch(() => undefined)
    return answer
  }
}

/**
 * Shows the question on the run (status `awaiting_input`) and pauses until the
 * user answers via `chatMessageRunAnswer`. The answer is persisted as a
 * {@link MessageUserAnswer} inside the run so it survives in history and is
 * rendered as a user bubble, and is collected in `userAnswers` for the live
 * conversation context. Throws {@link MessageRunStoppedError} when the run is
 * stopped while waiting.
 */
async function askUser(
  {
    assistantMessage,
    chatId,
    ctx,
    messageRun,
    signal,
    userAnswers,
  }: AskUserOptions,
  entry: MessageAssistantTool,
  question: FollowupQuestion,
): Promise<string> {
  // Record the tool call while it waits so the user sees it with the question.
  if (!assistantMessage.tools.includes(entry)) {
    assistantMessage.tools.push(entry)
  }

  entry.result = { awaitingInput: true, ok: true, question: question.question }
  messageRun.followupQuestion = question
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  let answer: string

  try {
    answer = await waitForMessageRunAnswer(messageRun.id)
  } catch {
    // The run was stopped (or retried, or deleted) while waiting.
    messageRun.followupQuestion = null
    throw new MessageRunStoppedError()
  }

  if (signal.aborted) {
    throw new MessageRunStoppedError()
  }

  const userAnswer: MessageUserAnswer = {
    id: crypto.randomUUID(),
    content: answer,
    createdAt: Date.now(),
    messageRunId: messageRun.id,
    role: "user_answer",
  }

  messageRun.assistantMessages.push(userAnswer)
  messageRun.followupQuestion = null
  messageRun.status = "running"
  userAnswers.push({ content: answer, role: "user" })

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  return answer
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
  ctx: AgentContext,
  messageRun: MessageRun,
  chatId: Chat["id"],
  signal: AbortSignal,
): Promise<boolean> {
  messageRun.continuationPrompt = { message: continuationPromptMessage }
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

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
    await persistMessageRunUpdate(ctx, chatId, messageRun)
    return true
  }

  return false
}

async function streamAssistantResponse(
  ctx: AgentContext,
  adapter: ReturnType<typeof createModelAdapter>,
  chatId: Chat["id"],
  conversationMessages: ChatMessage[],
  messageRun: MessageRun,
  toolDefinitions: RegisteredToolDefinition[],
  modelSettings: ModelRunSettings,
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
    ...(modelSettings.reasoningEffort !== undefined
      ? { reasoningEffort: modelSettings.reasoningEffort }
      : {}),
    ...(modelSettings.thinking !== undefined
      ? { thinking: modelSettings.thinking }
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

    await persistMessageRunUpdate(ctx, chatId, messageRun)

    if (chunk.done) {
      break
    }
  }

  return { assistantMessage, toolCalls }
}

async function persistMessageRunUpdate(
  ctx: AgentContext,
  chatId: Chat["id"],
  messageRun: MessageRun,
) {
  messageRun.updatedAt = Date.now()
  await ctx.store.updateMessageRun(messageRun)
  notifyMessageRunUpdated(ctx, chatId, messageRun.id)
}
