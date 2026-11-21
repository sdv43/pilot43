import type {
  Chat,
  ChatHistorySummary,
  MessageRun,
  Prompt,
} from "@pilot43/protocol"

import { serializeUserMessageContent } from "@pilot43/protocol"

import type { AgentContext } from "../../../context"

import { type ChatMessage, type ModelAdapter } from "../../../models"
import { toConversationMessages } from "./chat-history"
import { notifyMessageRunUpdated } from "./notify"

/** Latest runs before the current one that are always sent in full. */
export const keptRecentRunCount = 2

/** Share of the context window the runs sent in full may take at most. */
export const keptRecentWindowShare = 0.3

/** Share of the context window one summarising request may fill. */
const summaryInputWindowShare = 0.6

/** Context window assumed for summarising when the model's is unknown. */
const fallbackContextWindow = 16_000

/** Characters a token stands for in estimates. */
const charsPerToken = 4

/** Tokens an image counts as in estimates. */
const imageTokens = 1000

/** Longest text of one message or tool result put in a summarising request. */
const summaryEntryMaxLength = 4000

/** Longest tool call arguments put in a summarising request. */
const summaryArgumentsMaxLength = 500

const summaryInstructions = `You summarise a conversation between a user and an AI assistant that works in the user's web browser, so the assistant can carry on without the original messages.

Keep:
- the user's goals, requests, preferences and constraints;
- decisions made and conclusions reached;
- facts, figures, names, URLs, file names and code identifiers that were found or given;
- what tool calls found that still matters (not their raw output);
- the state of any task in progress and what is left to do.

Leave out greetings, repetition and raw tool output. If a previous summary is given, merge it with the new messages into one summary. Write in the language of the conversation, as short Markdown sections with bullet points, at most about 800 words. Reply with the summary only.`

export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / charsPerToken)
}

/** Rough size of messages sent to a model, in tokens. */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    let tokens = estimateTextTokens(message.content)

    if (message.role === "assistant") {
      for (const toolCall of message.toolCalls ?? []) {
        tokens += estimateTextTokens(toolCall.name + toolCall.arguments)
      }
    }

    if (message.role === "user") {
      tokens += (message.images?.length ?? 0) * imageTokens
    }

    return total + tokens
  }, 0)
}

/** Rough size of a run as sent to the model, in tokens. */
export function estimateRunTokens(run: MessageRun, prompts: Prompt[] = []) {
  return estimateMessagesTokens(toRunMessages(run, prompts))
}

function toRunMessages(run: MessageRun, prompts: Prompt[]): ChatMessage[] {
  return [
    ...toConversationMessages(run.userMessage, prompts),
    ...run.assistantMessages
      .slice()
      .sort((left, right) => left.createdAt - right.createdAt)
      .flatMap((entry) => toConversationMessages(entry, prompts)),
  ]
}

/** The chat's summary, if it still matches its runs. */
export function getValidHistorySummary(
  chat: Pick<Chat, "historySummary"> | undefined,
  runs: MessageRun[],
): ChatHistorySummary | undefined {
  const summary = chat?.historySummary

  return summary && runs.some(({ id }) => id === summary.throughRunId)
    ? summary
    : undefined
}

interface RunsToSummariseOptions {
  contextWindow?: number
  /**
   * Keep the latest runs in full (see {@link keptRecentRunCount}); `false`
   * summarises every run (`/compact`).
   */
  keepRecent: boolean
  prompts?: Prompt[]
  summary?: ChatHistorySummary
}

/**
 * Runs to fold into the summary: those after the ones the summary already
 * covers, except the latest ones sent in full. With an unknown context window
 * only the latest run is kept.
 */
export function getRunsToSummarise(
  runs: MessageRun[],
  { contextWindow, keepRecent, prompts = [], summary }: RunsToSummariseOptions,
): MessageRun[] {
  const start = summary
    ? runs.findIndex(({ id }) => id === summary.throughRunId) + 1
    : 0
  let end = runs.length

  if (keepRecent) {
    const maxKept = contextWindow ? keptRecentRunCount : 1
    const keptBudget = contextWindow
      ? contextWindow * keptRecentWindowShare
      : Infinity
    let keptTokens = 0

    while (end > start && runs.length - end < maxKept) {
      keptTokens += estimateRunTokens(runs[end - 1], prompts)

      if (keptTokens > keptBudget) {
        break
      }

      end -= 1
    }
  }

  return runs.slice(start, end)
}

/** Plain-text transcript of a run for a summarising request. */
export function toRunTranscript(run: MessageRun, prompts: Prompt[] = []) {
  const lines = [
    `User: ${truncate(serializeUserMessageContent(run.userMessage, prompts), summaryEntryMaxLength)}`,
  ]

  const entries = run.assistantMessages
    .slice()
    .sort((left, right) => left.createdAt - right.createdAt)

  for (const entry of entries) {
    if (entry.role === "user_answer") {
      lines.push(`User: ${truncate(entry.content, summaryEntryMaxLength)}`)
      continue
    }

    if (entry.content.trim()) {
      lines.push(`Assistant: ${truncate(entry.content, summaryEntryMaxLength)}`)
    }

    for (const tool of entry.tools) {
      lines.push(
        `Assistant called \`${tool.name}\` with ${truncate(JSON.stringify(tool.args ?? {}), summaryArgumentsMaxLength)}`,
      )

      if (tool.result !== null) {
        lines.push(
          `Result of \`${tool.name}\`: ${truncate(JSON.stringify(tool.result), summaryEntryMaxLength)}`,
        )
      }
    }
  }

  return lines.join("\n\n")
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength
    ? `${text.slice(0, maxLength)}… [${text.length - maxLength} more characters]`
    : text
}

/** Splits transcripts into pieces that each fit one summarising request. */
export function chunkTranscripts(
  transcripts: string[],
  maxLength: number,
): string[] {
  const chunks: string[] = []
  let current = ""

  for (const transcript of transcripts) {
    for (let start = 0; start < transcript.length; start += maxLength) {
      const piece = transcript.slice(start, start + maxLength)

      if (current && current.length + piece.length + 2 > maxLength) {
        chunks.push(current)
        current = ""
      }

      current = current ? `${current}\n\n${piece}` : piece
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

interface WriteSummaryOptions {
  adapter: ModelAdapter
  contextWindow?: number
  previousSummary?: string
  prompts?: Prompt[]
  runs: MessageRun[]
  signal?: AbortSignal
}

/**
 * Asks the model for a summary of the runs, merged with the previous summary.
 * Runs too long for one request are summarised in pieces, each merged into
 * the summary so far.
 */
export async function writeHistorySummary({
  adapter,
  contextWindow,
  previousSummary,
  prompts = [],
  runs,
  signal,
}: WriteSummaryOptions): Promise<string> {
  const maxChunkLength = Math.floor(
    (contextWindow ?? fallbackContextWindow) *
      summaryInputWindowShare *
      charsPerToken,
  )
  const chunks = chunkTranscripts(
    runs.map((run) => toRunTranscript(run, prompts)),
    maxChunkLength,
  )
  let summary = previousSummary

  for (const chunk of chunks) {
    summary = await requestSummary(adapter, summary, chunk, signal)
  }

  if (!summary?.trim()) {
    throw new Error("The model returned an empty summary.")
  }

  return summary.trim()
}

async function requestSummary(
  adapter: ModelAdapter,
  previousSummary: string | undefined,
  transcript: string,
  signal: AbortSignal | undefined,
): Promise<string> {
  const previous = previousSummary
    ? `<previous_summary>\n${previousSummary}\n</previous_summary>\n\n`
    : ""
  let content = ""

  for await (const chunk of adapter.chat(
    [
      { content: summaryInstructions, role: "system" },
      {
        content: `${previous}<conversation>\n${transcript}\n</conversation>\n\nWrite the summary.`,
        role: "user",
      },
    ],
    signal ? { signal } : {},
  )) {
    content += chunk.content

    if (chunk.done) {
      break
    }
  }

  if (!content.trim()) {
    throw new Error("The model returned an empty summary.")
  }

  return content
}

interface SummariseChatOptions {
  adapter: ModelAdapter
  chatId: Chat["id"]
  contextWindow?: number
  keepRecent: boolean
  /** Run the side panel refreshes the chat for while summarising. */
  notifyRunId: MessageRun["id"]
  prompts?: Prompt[]
  /** Runs that may be summarised, oldest first. */
  runs: MessageRun[]
  signal?: AbortSignal
}

/**
 * Folds the chat's earlier runs into its history summary. Returns the new
 * summary, or `undefined` when there is nothing left to summarise.
 */
export async function summariseChatHistory(
  ctx: AgentContext,
  {
    adapter,
    chatId,
    contextWindow,
    keepRecent,
    notifyRunId,
    prompts = [],
    runs,
    signal,
  }: SummariseChatOptions,
): Promise<ChatHistorySummary | undefined> {
  const chat = await ctx.store.getChatById(chatId)
  const previous = getValidHistorySummary(chat, runs)
  const toSummarise = getRunsToSummarise(runs, {
    contextWindow,
    keepRecent,
    prompts,
    summary: previous,
  })
  const last = toSummarise.at(-1)

  if (!last) {
    return undefined
  }

  await ctx.store.updateChatState(chatId, { isSummarisingHistory: true })
  notifyMessageRunUpdated(ctx, chatId, notifyRunId)

  let summary: ChatHistorySummary | undefined

  try {
    const content = await writeHistorySummary({
      adapter,
      contextWindow,
      previousSummary: previous?.content,
      prompts,
      runs: toSummarise,
      signal,
    })

    summary = {
      content,
      createdAt: Date.now(),
      throughRunId: last.id,
      tokenCount: estimateTextTokens(content),
    }

    return summary
  } finally {
    await ctx.store.updateChatState(chatId, {
      ...(summary ? { historySummary: summary } : {}),
      isSummarisingHistory: false,
    })
    notifyMessageRunUpdated(ctx, chatId, notifyRunId)
  }
}

/**
 * Drops the chat's history summary when it no longer matches the runs: the
 * last run it covers is gone, or `changedRunId` (a run about to be deleted,
 * rerun or continued) is one it covers.
 */
export async function invalidateHistorySummary(
  ctx: AgentContext,
  chatId: Chat["id"],
  changedRunId?: MessageRun["id"],
) {
  const chat = await ctx.store.getChatById(chatId)
  const summary = chat?.historySummary

  if (!summary) {
    return
  }

  const runs = await ctx.store.getMessageRunsByChat(chatId)
  const throughIndex = runs.findIndex(({ id }) => id === summary.throughRunId)
  const changedIndex = changedRunId
    ? runs.findIndex(({ id }) => id === changedRunId)
    : -1

  if (
    throughIndex === -1 ||
    (changedIndex !== -1 && changedIndex <= throughIndex)
  ) {
    await ctx.store.updateChatState(chatId, { historySummary: null })
  }
}

/**
 * Whether the provider refused the request because the prompt does not fit
 * the model's context window. Providers word it differently.
 */
export function isContextOverflowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const { code, message } = error as { code?: unknown; message?: unknown }

  if (code === "context_length_exceeded") {
    return true
  }

  return (
    typeof message === "string" &&
    /context[_ ](length|window)|maximum context|prompt is too long|input is too long|too many tokens|exceeds? the (model's )?(context|maximum)|reduce the length of the (messages|prompt)/i.test(
      message,
    )
  )
}
