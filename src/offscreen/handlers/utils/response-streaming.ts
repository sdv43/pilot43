import type { RegisteredToolDefinition } from "@/offscreen/tools/types"
import type {
  Chat,
  MessageAssistant,
  MessageRun,
  MessageUserAnswer,
} from "@/shared/api"

import {
  type ChatMessage,
  type ChatToolCall,
  type ChatToolDefinition,
  createModelAdapter,
} from "@/offscreen/models"
import {
  getAllCommands,
  getChatById,
  getMessageRunById,
  getMessageRunsByChat,
  type ModelProvider,
  updateMessageRun,
} from "@/offscreen/storage"
import {
  askFollowupQuestionToolName,
  buildInteractiveToolResult,
  executeToolCalls,
  getEnabledToolDefinitionsAsync,
  isInteractiveTool,
  parseAskFollowupQuestionArgs,
} from "@/offscreen/tools/runtime"
import { builtinCommands } from "@/shared/api"

import { maxToolRoundTrips } from "../const"
import { continuationAnswerContinue, continuationPromptMessage } from "../const"
import {
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry"
import { waitForMessageRunAnswer } from "./await-registry"
import {
  buildConversationHistory,
  toConversationMessages,
} from "./chat-history"
import { notifySidepanel } from "./notification"

export async function generateResponse(
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
  modelName: string,
  provider: ModelProvider,
) {
  const abortController = new AbortController()
  const signal = registerAbortController(messageRunId, abortController)

  try {
    // Get message run
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

    // Get all previous messages in chat for context
    const sortedRuns = (await getMessageRunsByChat(chatId)).sort(
      (a, b) => a.createdAt - b.createdAt,
    )
    const userCommands = await getAllCommands()
    const commands = [...builtinCommands, ...userCommands]
    const conversationMessages = buildConversationHistory(
      sortedRuns,
      chat,
      commands,
    )
    const toolDefinitions = await getEnabledToolDefinitionsAsync(chat)

    // Create model adapter and start streaming
    const adapter = createModelAdapter(provider, modelName)

    let toolRoundTripCount = 0
    while (true) {
      // Stop iterating tool round trips if the user aborted the run.
      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(chatId, messageRun)
        return
      }

      // When the model reaches the tool round-trip limit, pause and ask the
      // user whether to keep going instead of failing. If they continue, the
      // counter resets for another full batch of round trips; if they stop,
      // the run is marked as stopped.
      if (toolRoundTripCount >= maxToolRoundTrips) {
        const shouldContinue = await requestContinuation(
          messageRun,
          chatId,
          signal,
        )

        if (shouldContinue) {
          toolRoundTripCount = 0
          continue
        }

        messageRun.status = "stopped"
        await persistMessageRunUpdate(chatId, messageRun)
        return
      }

      const { assistantMessage, toolCalls } = await streamAssistantResponse(
        adapter,
        chatId,
        conversationMessages,
        messageRun,
        toolDefinitions,
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

      if (interactiveCalls.length > 0) {
        // Process interactive tool calls (ask_followup_question /
        // update_todo_list) before any regular tool calls in this batch so the
        // UI state is reflected and, when needed, generation pauses for input.
        // `processInteractiveToolCalls` appends the assistant message (with its
        // tool calls and results) to the conversation context before pausing,
        // so the order stays: assistant tool call + result, then user answer.
        await processInteractiveToolCalls(
          interactiveCalls,
          assistantMessage,
          messageRun,
          conversationMessages,
          chatId,
          signal,
        )

        if (signal.aborted) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(chatId, messageRun)
          return
        }

        // Execute the remaining non-interactive tool calls in this batch.
        const remainingCalls = toolCalls.filter(
          (toolCall) => !isInteractiveTool(toolCall.name),
        )

        if (remainingCalls.length > 0) {
          assistantMessage.tools.push(
            ...(await executeToolCalls(
              remainingCalls,
              toolDefinitions,
              chatId,
            )),
          )
        }

        await persistMessageRunUpdate(chatId, messageRun)
        // The assistant message was already appended to the conversation
        // context inside processInteractiveToolCalls (before the user answer).
        // Only append it here when there were no follow-up questions, i.e. the
        // interactive calls were all non-pausing (e.g. update_todo_list).
        if (
          !interactiveCalls.some((c) => c.name === askFollowupQuestionToolName)
        ) {
          conversationMessages.push(...toConversationMessages(assistantMessage))
        }
        toolRoundTripCount += 1
        continue
      }

      assistantMessage.tools = await executeToolCalls(
        toolCalls,
        toolDefinitions,
        chatId,
      )
      await persistMessageRunUpdate(chatId, messageRun)
      conversationMessages.push(...toConversationMessages(assistantMessage))
      toolRoundTripCount += 1
    }
  } catch (error) {
    console.error("Error in generateResponse:", error)

    // Mark as failed
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
 * Pauses generation when the assistant reaches the tool round-trip limit and
 * asks the user whether to continue. Sets the run status to `awaiting_input`
 * and surfaces a {@link ContinuationPrompt} on the run so the sidepanel can
 * render a confirm/stop UI. Resolves `true` when the user chooses to continue
 * (resetting the round-trip counter) and `false` when they stop or abort.
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
          tools: toolDefinitions.map(
            (tool): ChatToolDefinition => ({
              description: tool.definition.description,
              inputSchema: tool.inputSchema,
              name: tool.definition.name,
            }),
          ),
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

function parseToolArgs(rawArguments: string): Record<string, unknown> {
  if (!rawArguments.trim()) {
    return {}
  }
  return JSON.parse(rawArguments) as Record<string, unknown>
}

/**
 * Processes interactive tool calls (`ask_followup_question` and
 * `update_todo_list`). Records tool result entries on the assistant message so
 * the conversation history reflects the call, persists any UI state, and —
 * when a follow-up question is present — pauses generation until the user
 * answers. Because {@link generateResponse} is fire-and-forget, awaiting the
 * answer promise here pauses the loop in place and resumes it automatically
 * once the sidepanel submits an answer.
 *
 * The user's answer is persisted as a {@link MessageUserAnswer} inside the
 * run's `assistantMessages` so it survives in history and is rendered as a
 * user bubble, and is also appended to the live conversation context.
 */
async function processInteractiveToolCalls(
  interactiveCalls: ChatToolCall[],
  assistantMessage: MessageAssistant,
  messageRun: MessageRun,
  conversationMessages: ChatMessage[],
  chatId: Chat["id"],
  signal: AbortSignal,
): Promise<void> {
  for (const toolCall of interactiveCalls) {
    let args: Record<string, unknown> = {}

    try {
      args = parseToolArgs(toolCall.arguments)

      if (toolCall.name === askFollowupQuestionToolName) {
        const { followUp, question } = parseAskFollowupQuestionArgs(args)
        messageRun.followupQuestion = { followUp, question }
        messageRun.status = "awaiting_input"
        assistantMessage.tools.push(
          buildInteractiveToolResult(toolCall, args, {
            awaitingInput: true,
            ok: true,
            question,
          }),
        )
        await persistMessageRunUpdate(chatId, messageRun)

        // Append the assistant message (with the tool call and its result) to
        // the conversation context BEFORE pausing, so the order is:
        // assistant tool call + result, then the user's answer below.
        conversationMessages.push(...toConversationMessages(assistantMessage))

        // Pause generation until the user answers.
        let answer: string
        try {
          answer = await waitForMessageRunAnswer(messageRun.id)
        } catch {
          // The run was stopped while waiting for an answer.
          messageRun.followupQuestion = null
          return
        }
        if (signal.aborted) {
          return
        }

        // Persist the answer as a user-answer entry inside the run so it stays
        // in the saved history and is shown as a (gray) user bubble.
        const userAnswer: MessageUserAnswer = {
          id: crypto.randomUUID(),
          content: answer,
          createdAt: Date.now(),
          messageRunId: messageRun.id,
          role: "user_answer",
        }
        messageRun.assistantMessages.push(userAnswer)

        // Clear the pending question and resume. The answer is also appended to
        // the live conversation context so the model sees it on the next turn.
        messageRun.followupQuestion = null
        messageRun.status = "running"
        conversationMessages.push({ content: answer, role: "user" })
        await persistMessageRunUpdate(chatId, messageRun)
      } else {
        assistantMessage.tools.push(
          buildInteractiveToolResult(toolCall, args, {
            error: `Tool \`${toolCall.name}\` is not implemented.`,
            ok: false,
          }),
        )
      }
    } catch (error) {
      assistantMessage.tools.push(
        buildInteractiveToolResult(toolCall, args, {
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        }),
      )
    }
  }
}
