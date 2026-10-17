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
  continuationPromptMessage,
  getRateLimitPromptMessage,
  resolveToolPermission,
  setToolPermission,
  toolApprovalAnswers,
  type ToolSource,
} from "@pilot43/protocol"

import type { AgentContext } from "../../../context"
import type { ModelProvider } from "../../../storage"
import type { RegisteredToolDefinition, Tool } from "../../../tools/types"

import {
  type ChatMessage,
  type ChatToolCall,
  type ChatToolDefinition,
  createModelAdapter,
} from "../../../models"
import { MessageRunStoppedError } from "../../../tools/errors"
import { executeToolCalls, getEnabledTools } from "../../../tools/runtime"
import { maxConsecutiveToolRoundTrips } from "../../const"
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
import { syncChatWithRun } from "./sync-chat"

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
    messageRun.startedAt = Date.now()
    await persistMessageRunUpdate(ctx, chatId, messageRun)

    const adapter = createModelAdapter(provider, modelName)
    const workspace = await ctx.store.getWorkspaceById(chat.workspaceId)
    // Tools disabled in the workspace are never offered to the model.
    const enabledTools = (
      await getEnabledTools(chat, ctx.toolset, { store: ctx.store })
    ).filter(
      (tool) =>
        tool.definition.hidden ||
        resolveToolPermission(
          workspace?.toolPermissions,
          getToolSource(tool),
          tool.definition.name,
        ) !== "disabled",
    )
    const conversationMessages = buildConversationHistory(
      buildSystemPrompt(ctx.systemPrompt(), workspace?.systemPrompt),
      await ctx.store.getMessageRunsByChat(chatId),
      chat,
      [...builtinPrompts, ...(await ctx.store.getAllPrompts())],
    )

    // Tool round trips since the user last sent a message or confirmed the
    // run may continue.
    let toolRoundTrips = 0

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
          { kind: "tool_limit", message: continuationPromptMessage },
        )

        if (!shouldContinue) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(ctx, chatId, messageRun)
          return
        }

        toolRoundTrips = 0
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
        if (signal.aborted || !isRateLimitError(error)) {
          throw error
        }

        // The provider rejected the request with a rate limit: pause instead
        // of failing. Continue retries the same request.
        removeEmptyAssistantMessage(messageRun)

        const shouldRetry = await requestContinuation(
          ctx,
          messageRun,
          chatId,
          signal,
          {
            kind: "rate_limit",
            message: getRateLimitPromptMessage(provider.name),
          },
        )

        if (!shouldRetry) {
          messageRun.status = "stopped"
          await persistMessageRunUpdate(ctx, chatId, messageRun)
          return
        }

        continue
      }

      const { assistantMessage, toolCalls } = response

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
          policy: ctx.toolset.policy,
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
        ...toConversationMessages(assistantMessage),
        ...userAnswers,
      )

      toolRoundTrips += 1
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

/** Appends the workspace's instructions to the platform system prompt. */
function buildSystemPrompt(
  systemPrompt: string,
  workspaceSystemPrompt: string | undefined,
) {
  const instructions = workspaceSystemPrompt?.trim()

  if (!instructions) {
    return systemPrompt
  }

  return `${systemPrompt}\n\n<workspace_instructions>\n${instructions}\n</workspace_instructions>`
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
 * Pauses the run until the user allows or denies a tool call set to "Always
 * ask". "Always allow" also switches the tool to "Always allow" in the
 * workspace. Throws {@link MessageRunStoppedError} when the run is stopped
 * while waiting.
 */
async function askApproval(
  { chat, chatId, ctx, messageRun, signal }: AskUserOptions,
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

  if (answer === toolApprovalAnswers.alwaysAllow) {
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
    answer === toolApprovalAnswers.allowOnce ||
    answer === toolApprovalAnswers.alwaysAllow

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
): Promise<boolean> {
  messageRun.continuationPrompt = prompt
  messageRun.status = "awaiting_input"

  await persistMessageRunUpdate(ctx, chatId, messageRun)

  let answer: string
  try {
    answer = (await waitForMessageRunAnswer(messageRun.id)).text
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
