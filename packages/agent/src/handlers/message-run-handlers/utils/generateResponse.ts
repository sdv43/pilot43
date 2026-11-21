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
  builtinPrompts,
  continuationAnswerContinue,
  type ContinuationPrompt,
  getRateLimitPromptMessage,
  getToolLimitPromptMessage,
  parseToolApprovalAnswer,
  resolveToolPermission,
  setToolPermission,
  toolApprovalAnswers,
  type ToolSource,
} from "@pilot43/protocol"

import type { AgentContext } from "../../../context"
import type { ModelProvider } from "../../../storage"
import type {
  RegisteredToolDefinition,
  Tool,
  ToolInstructions,
} from "../../../tools/types"

import {
  type ChatMessage,
  type ChatToolCall,
  type ChatToolDefinition,
  createModelAdapter,
  type FinishReason,
} from "../../../models"
import { MessageRunStoppedError } from "../../../tools/errors"
import {
  executeToolCalls,
  getEnabledTools,
  getToolInstructions,
} from "../../../tools/runtime"
import { maxConsecutiveToolRoundTrips } from "../../const"
import {
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry"
import {
  resolveMessageRunAnswer,
  waitForMessageRunAnswer,
} from "./await-registry"
import {
  buildConversationHistory,
  toConversationMessages,
} from "./chat-history"
import { notifyMessageRunUpdated } from "./notify"
import { createRepeatedToolCallGuard } from "./repeated-tool-calls"
import { isGeneratingStatus, syncChatWithRun } from "./sync-chat"

/**
 * Least time between saves of a streaming reply. Clients follow the stream
 * through `messageRunStreamed` notifications; saves only keep the stored run
 * close for a client that opens mid-stream.
 */
export const streamSaveIntervalMs = 1000

/** Least time between `messageRunStreamed` notifications of a reply. */
export const streamNotifyIntervalMs = 50

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

    // Once the run is stopped, saves made while the loop winds down (e.g. a
    // tool call that finishes after the stop) must not mark it as generating
    // again.
    signal.addEventListener(
      "abort",
      () => {
        if (isGeneratingStatus(messageRun.status)) {
          messageRun.status = "stopped"
        }
      },
      { once: true },
    )

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
    messageRun.startedAt = Date.now()
    await persistMessageRunUpdate(ctx, chatId, messageRun)

    const adapter = createModelAdapter(provider, modelName)
    const workspace = await ctx.store.getWorkspaceById(chat.workspaceId)
    // Tools disabled in the workspace are never offered to the model.
    const [availableTools, toolInstructions] = await Promise.all([
      getEnabledTools(chat, ctx.toolset, { store: ctx.store }),
      getToolInstructions(chat, ctx.toolset, { store: ctx.store }),
    ])
    const enabledTools = availableTools.filter(
      (tool) =>
        tool.definition.hidden ||
        resolveToolPermission(
          workspace?.toolPermissions,
          getToolSource(tool),
          tool.definition.name,
        ) !== "disabled",
    )
    const conversationMessages = buildConversationHistory(
      buildSystemPrompt(
        ctx.systemPrompt(),
        workspace?.systemPrompt,
        toolInstructions,
      ),
      await ctx.store.getMessageRunsByChat(chatId),
      chat,
      [...builtinPrompts, ...(await ctx.store.getAllPrompts())],
    )

    // Tool round trips (and the calls they made) since the user last sent a
    // message or confirmed the run may continue.
    let toolRoundTrips = 0
    let toolCallsInRow = 0
    // Automatic retries of the current request after rate limits/overload.
    let providerRetryAttempts = 0
    const repeatedToolCallGuard = createRepeatedToolCallGuard()

    while (true) {
      // Stop iterating tool round trips if the user aborted the run.
      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      // After many tool round trips in a row, pause and ask the user whether
      // to keep going. Continuing allows another full batch of round trips.
      if (toolRoundTrips >= maxConsecutiveToolRoundTrips) {
        const shouldContinue = await requestContinuation(
          ctx,
          messageRun,
          chatId,
          signal,
          {
            kind: "tool_limit",
            message: getToolLimitPromptMessage(toolCallsInRow),
            toolCallCount: toolCallsInRow,
          },
        )

        if (!shouldContinue) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(ctx, chatId, messageRun)
          return
        }

        toolRoundTrips = 0
        toolCallsInRow = 0
      }

      let response: Awaited<ReturnType<typeof streamAssistantResponse>>

      try {
        response = await streamAssistantResponse(
          ctx,
          adapter,
          chatId,
          conversationMessages,
          messageRun,
          enabledTools,
          modelSettings,
          signal,
        )
      } catch (error) {
        const retryable = signal.aborted
          ? null
          : getRetryableProviderError(error)

        if (!retryable) {
          throw error
        }

        // The provider rate-limited the request or is overloaded: pause and
        // retry on our own after a delay (Retry-After when sent), up to
        // `maxProviderRetries` times; after that the user retries by hand.
        removeEmptyAssistantMessage(messageRun)
        providerRetryAttempts += 1

        const isAutomatic = providerRetryAttempts <= maxProviderRetries
        const delayMs = getProviderRetryDelay(
          providerRetryAttempts,
          retryable.retryAfterMs,
        )

        const shouldRetry = await requestContinuation(
          ctx,
          messageRun,
          chatId,
          signal,
          {
            kind: "rate_limit",
            message: getRateLimitPromptMessage(provider.name, retryable.kind),
            ...(isAutomatic
              ? {
                  attempt: providerRetryAttempts,
                  maxAttempts: maxProviderRetries,
                  retryAt: Date.now() + delayMs,
                }
              : {}),
          },
          isAutomatic ? delayMs : undefined,
        )

        if (!shouldRetry) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(ctx, chatId, messageRun)
          return
        }

        continue
      }

      providerRetryAttempts = 0

      const { assistantMessage, finishReason, finished, toolCalls } = response

      // Some adapters end the stream quietly when the run is aborted.
      if (signal.aborted) {
        messageRun.status = "stopped"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      // The stream ended without the provider finishing the reply (e.g. the
      // connection dropped): don't present the partial reply as complete.
      if (!finished) {
        throw new Error(
          "The model's response ended unexpectedly. The connection may have dropped.",
        )
      }

      const outputTruncated = finishReason === "length"

      if (outputTruncated) {
        assistantMessage.truncated = true
      }

      if (toolCalls.length === 0) {
        messageRun.status = "completed"
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        return
      }

      // Answers the user gives to tools during this round trip. They follow
      // the assistant message and its tool results in the conversation.
      const userAnswers: ChatMessage[] = []

      const prompts = createUserPrompts({
        chat,
        chatId,
        ctx,
        messageRun,
        signal,
        userAnswers,
      })

      await persistMessageRunUpdate(ctx, chatId, messageRun)

      const { stopped } = await executeToolCalls(
        toolCalls,
        enabledTools,
        assistantMessage,
        {
          askUser: prompts.askUser,
          chatId,
          messageRunId,
          onToolUpdate: () => persistMessageRunUpdate(ctx, chatId, messageRun),
          outputTruncated,
          policy: ctx.toolset.policy,
          rejectCall: repeatedToolCallGuard.nextRound(toolCalls),
          requestApproval: prompts.requestApproval,
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
        ...toConversationMessages(assistantMessage, [], {
          withReasoning: true,
        }),
        ...userAnswers,
      )

      toolRoundTrips += 1
      toolCallsInRow += toolCalls.length
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

/**
 * Appends the tool providers' instructions (e.g. MCP server instructions) and
 * then the workspace's instructions to the platform system prompt.
 */
function buildSystemPrompt(
  systemPrompt: string,
  workspaceSystemPrompt: string | undefined,
  toolInstructions: ToolInstructions[] = [],
) {
  const sections = [systemPrompt]

  for (const { source, text } of toolInstructions) {
    sections.push(
      `<tool_instructions source="${source}">\n${text}\n</tool_instructions>`,
    )
  }

  const instructions = workspaceSystemPrompt?.trim()

  if (instructions) {
    sections.push(
      `<workspace_instructions>\n${instructions}\n</workspace_instructions>`,
    )
  }

  return sections.join("\n\n")
}

/**
 * Whether the provider rejected the request because of a rate limit (HTTP
 * 429). SDKs expose the status under different names, so several are checked.
 */
export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const { message, status, statusCode } = error as {
    message?: unknown
    status?: unknown
    statusCode?: unknown
  }

  if (status === 429 || statusCode === 429) {
    return true
  }

  return typeof message === "string" && /\b429\b|rate[ -]?limit/i.test(message)
}

/** Automatic retries after a rate limit or overload before asking the user. */
export const maxProviderRetries = 3

/**
 * Rate limit (429) or overload (529, 503) errors, which are worth retrying,
 * with the provider's Retry-After when it sent one.
 */
export function getRetryableProviderError(
  error: unknown,
): null | { kind: "overloaded" | "rate_limit"; retryAfterMs?: number } {
  if (typeof error !== "object" || error === null) {
    return null
  }

  const { headers, message, status, statusCode } = error as {
    headers?: unknown
    message?: unknown
    status?: unknown
    statusCode?: unknown
  }
  const code = typeof status === "number" ? status : statusCode
  const text = typeof message === "string" ? message : ""
  const retryAfterMs = parseRetryAfter(headers)
  const extra = retryAfterMs !== undefined ? { retryAfterMs } : {}

  if (isRateLimitError(error)) {
    return { kind: "rate_limit", ...extra }
  }

  if (code === 529 || code === 503 || /\b529\b|overloaded/i.test(text)) {
    return { kind: "overloaded", ...extra }
  }

  return null
}

/** Retry-After header (seconds or an HTTP date) in ms, capped at 2 minutes. */
function parseRetryAfter(headers: unknown): number | undefined {
  let value: unknown

  if (headers instanceof Headers) {
    value = headers.get("retry-after")
  } else if (typeof headers === "object" && headers !== null) {
    value = (headers as Record<string, unknown>)["retry-after"]
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined
  }

  const seconds = Number(value)
  const ms = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now()

  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 120_000) : undefined
}

/** Delay before an automatic retry: Retry-After, else 6s, 12s, 24s… (≤60s). */
export function getProviderRetryDelay(attempt: number, retryAfterMs?: number) {
  return retryAfterMs ?? Math.min(60_000, 6000 * 2 ** (attempt - 1))
}

/**
 * Drops the assistant message started for a request that failed before the
 * model produced anything, so a retry does not leave an empty message behind.
 */
function removeEmptyAssistantMessage(messageRun: MessageRun) {
  const last = messageRun.assistantMessages.at(-1)

  if (
    last?.role === "assistant" &&
    !last.content &&
    !last.thoughts &&
    last.tools.length === 0
  ) {
    messageRun.assistantMessages.pop()
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "AbortError" || /aborted/i.test(error.message)
  }
  return false
}

interface AskUserOptions {
  chat: Chat
  chatId: Chat["id"]
  ctx: AgentContext
  messageRun: MessageRun
  signal: AbortSignal
  userAnswers: ChatMessage[]
}

/**
 * Implements `ToolContext.askUser` and tool approval for the tool calls of one
 * round trip. Questions and approvals are shown one at a time so concurrent
 * tools never overwrite each other's pending prompt.
 */
function createUserPrompts(options: AskUserOptions): {
  askUser: (
    entry: MessageAssistantTool,
    question: FollowupQuestion,
  ) => Promise<string>
  requestApproval: (entry: MessageAssistantTool, tool: Tool) => Promise<boolean>
} {
  let queue: Promise<unknown> = Promise.resolve()

  function enqueue<T>(prompt: () => Promise<T>): Promise<T> {
    const result = queue.then(prompt)
    queue = result.catch(() => undefined)
    return result
  }

  return {
    askUser: (entry, question) =>
      enqueue(() => askUser(options, entry, question)),
    requestApproval: async (entry, tool) => {
      const source = getToolSource(tool)
      const workspace = await options.ctx.store.getWorkspaceById(
        options.chat.workspaceId,
      )

      const permission = tool.definition.hidden
        ? "allow"
        : resolveToolPermission(
            workspace?.toolPermissions,
            source,
            tool.definition.name,
          )

      if (permission === "allow") {
        entry.approval = "allowed"
        return true
      }

      // Disabled after the run started: refuse without asking.
      if (permission === "disabled") {
        return false
      }

      return enqueue(() => askApproval(options, entry, tool, source))
    },
  }
}

/** Built-in tool or the MCP server a tool comes from. */
function getToolSource(tool: Tool): ToolSource {
  return tool.definition.name.startsWith("mcp__") && tool.group
    ? { server: tool.group, type: "mcp" }
    : { type: "builtin" }
}

/**
 * Pauses the run until the user allows or denies a tool call set to "Ask".
 * "Always allow" also switches the tool to "Allow" in the workspace. A
 * message typed while waiting denies the call and is passed to the model as
 * the reason (shown as a user bubble). Throws {@link MessageRunStoppedError}
 * when the run is stopped while waiting.
 */
async function askApproval(
  { chat, chatId, ctx, messageRun, signal, userAnswers }: AskUserOptions,
  entry: MessageAssistantTool,
  tool: Tool,
  source: ToolSource,
): Promise<boolean> {
  entry.status = "awaiting_approval"
  messageRun.toolApproval = {
    ...(source.type === "mcp" ? { server: source.server } : {}),
    toolCallId: entry.id ?? "",
    toolName: tool.definition.name,
  }
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  let answer: string

  try {
    answer = (await waitForMessageRunAnswer(messageRun.id)).text
  } catch {
    messageRun.toolApproval = null
    throw new MessageRunStoppedError()
  } finally {
    messageRun.toolApproval = null
  }

  if (signal.aborted) {
    throw new MessageRunStoppedError()
  }

  messageRun.status = "running"

  const { decision, feedback } = parseToolApprovalAnswer(answer)

  if (feedback) {
    messageRun.assistantMessages.push({
      content: feedback,
      createdAt: Date.now(),
      id: crypto.randomUUID(),
      messageRunId: messageRun.id,
      role: "user_answer",
    })
    userAnswers.push({ content: feedback, role: "user" })
  }

  if (decision === toolApprovalAnswers.alwaysAllow) {
    const workspace = await ctx.store.getWorkspaceById(chat.workspaceId)

    if (workspace) {
      await ctx.store.updateWorkspace({
        ...workspace,
        toolPermissions: setToolPermission(
          workspace.toolPermissions,
          source,
          tool.definition.name,
          "allow",
        ),
      })
    }
  }

  const approved =
    decision === toolApprovalAnswers.allowOnce ||
    decision === toolApprovalAnswers.alwaysAllow

  entry.approval = approved ? "approved" : "asked"
  await persistMessageRunUpdate(ctx, chatId, messageRun)

  return approved
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
  { chatId, ctx, messageRun, signal, userAnswers }: AskUserOptions,
  entry: MessageAssistantTool,
  question: FollowupQuestion,
): Promise<string> {
  entry.result = { awaitingInput: true, ok: true, question: question.question }
  messageRun.followupQuestion = question
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  let answer: string
  let answers: MessageUserAnswer["answers"]

  try {
    ;({ answers, text: answer } = await waitForMessageRunAnswer(messageRun.id))
  } catch {
    // The run was stopped (or retried, or deleted) while waiting.
    messageRun.followupQuestion = null
    throw new MessageRunStoppedError()
  }

  if (signal.aborted) {
    throw new MessageRunStoppedError()
  }

  const userAnswer: MessageUserAnswer = {
    ...(answers ? { answers } : {}),
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
 * Pauses generation and asks the user whether to continue: after many tool
 * round trips in a row, or when the provider rate-limits a request. Sets the
 * run status to `awaiting_input` and surfaces a {@link ContinuationPrompt} so
 * the side panel shows a notice with Continue (and Stop). Resolves `true` when
 * the user continues and `false` when they stop or abort.
 *
 * Reuses the same answer registry as `ask_followup_question` so the existing
 * `chatMessageRunAnswer` action drives the resume.
 */
async function requestContinuation(
  ctx: AgentContext,
  messageRun: MessageRun,
  chatId: Chat["id"],
  signal: AbortSignal,
  prompt: ContinuationPrompt,
  /** Continue on our own after this many ms unless the user answers first. */
  autoContinueAfterMs?: number,
): Promise<boolean> {
  messageRun.continuationPrompt = prompt
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  let answer: string
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (autoContinueAfterMs !== undefined) {
      timer = setTimeout(() => {
        // Resolves the pending wait below as if the user chose Continue.
        resolveMessageRunAnswer(messageRun.id, {
          text: continuationAnswerContinue,
        })
      }, autoContinueAfterMs)
    }

    answer = (await waitForMessageRunAnswer(messageRun.id)).text
  } catch {
    clearTimeout(timer)
    // The run was stopped (or deleted) while waiting for confirmation.
    messageRun.continuationPrompt = null
    return false
  }

  clearTimeout(timer)
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
): Promise<{
  assistantMessage: MessageAssistant
  finishReason?: FinishReason
  /** Whether the provider finished the reply (sent its final chunk). */
  finished: boolean
  toolCalls: ChatToolCall[]
}> {
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
    sessionId: chatId,
    signal,
  }
  let toolCalls: ChatToolCall[] = []
  let finishReason: FinishReason | undefined
  let finished = false
  // Clients get the message with the first chunk (a full save), then follow
  // its text through throttled notifications.
  let isAnnounced = false
  let savedAt = 0

  const streamNotifier = createThrottle(() => {
    notifyMessageStreamed(ctx, chatId, messageRun.id, assistantMessage)
  }, streamNotifyIntervalMs)

  messageRun.assistantMessages.push(assistantMessage)

  try {
    for await (const chunk of adapter.chat(conversationMessages, config)) {
      if (chunk.content) {
        assistantMessage.content += chunk.content
      }

      if (chunk.thoughts) {
        assistantMessage.thoughts =
          (assistantMessage.thoughts ?? "") + chunk.thoughts
        assistantMessage.thinkingMs = Date.now() - assistantMessage.createdAt
      }

      if (chunk.reasoningDetails) {
        assistantMessage.reasoningDetails = chunk.reasoningDetails
      }

      if (chunk.usage?.completionTokens !== undefined) {
        assistantMessage.tokenCount = chunk.usage.completionTokens
      }

      if (chunk.usage?.promptTokens !== undefined) {
        assistantMessage.promptTokens = chunk.usage.promptTokens
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

      if (chunk.done) {
        finished = true
        finishReason = chunk.finishReason
        break
      }

      if (!isAnnounced) {
        isAnnounced = true
        savedAt = Date.now()
        await persistMessageRunUpdate(ctx, chatId, messageRun)
        continue
      }

      streamNotifier.schedule()

      if (Date.now() - savedAt >= streamSaveIntervalMs) {
        savedAt = Date.now()
        messageRun.updatedAt = savedAt
        await ctx.store.updateMessageRun(messageRun)
      }
    }
  } finally {
    streamNotifier.cancel()
  }

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  return { assistantMessage, finishReason, finished, toolCalls }
}

/**
 * Calls `fn` at most once per `intervalMs`; a call scheduled within the
 * interval runs at its end, so the latest state is always delivered.
 */
function createThrottle(fn: () => void, intervalMs: number) {
  let calledAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const call = () => {
    timer = undefined
    calledAt = Date.now()
    fn()
  }

  return {
    cancel() {
      clearTimeout(timer)
      timer = undefined
    },
    schedule() {
      if (timer !== undefined) {
        return
      }

      const wait = calledAt + intervalMs - Date.now()

      if (wait <= 0) {
        call()
      } else {
        timer = setTimeout(call, wait)
      }
    },
  }
}

function notifyMessageStreamed(
  ctx: AgentContext,
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
  message: MessageAssistant,
) {
  ctx.notifier.notify({
    action: "messageRunStreamed",
    payload: {
      chatId,
      message: {
        content: message.content,
        id: message.id,
        ...(message.thinkingMs !== undefined
          ? { thinkingMs: message.thinkingMs }
          : {}),
        ...(message.thoughts !== undefined
          ? { thoughts: message.thoughts }
          : {}),
      },
      messageRunId,
    },
  })
}

async function persistMessageRunUpdate(
  ctx: AgentContext,
  chatId: Chat["id"],
  messageRun: MessageRun,
) {
  messageRun.updatedAt = Date.now()

  if (
    messageRun.completedAt === undefined &&
    (messageRun.status === "completed" ||
      messageRun.status === "failed" ||
      messageRun.status === "stopped")
  ) {
    messageRun.completedAt = messageRun.updatedAt
  }

  await ctx.store.updateMessageRun(messageRun)
  await syncChatWithRun(ctx, chatId, messageRun)
  notifyMessageRunUpdated(ctx, chatId, messageRun.id)
}
