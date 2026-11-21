import type {
  Chat,
  ChatHistorySummary,
  ChatSettings,
  MessageAssistant,
  MessageRun,
  Workspace,
} from "@pilot43/protocol"

import type { AgentContext } from "../context"

import { abortMessageRun } from "./message-run-handlers/utils/abort-registry"
import { rejectMessageRunAnswer } from "./message-run-handlers/utils/await-registry"
import {
  estimateRunTokens,
  getValidHistorySummary,
} from "./message-run-handlers/utils/history-summary"

export async function handleChatGetByWorkspace(
  ctx: AgentContext,
  workspaceId: Workspace["id"],
): Promise<Chat[]> {
  return await ctx.store.getChatsByWorkspace(workspaceId)
}

/**
 * Deletes a chat with its message runs and the files generated via the
 * `generate_file` tool.
 */
export async function deleteChatWithData(
  ctx: AgentContext,
  chatId: Chat["id"],
): Promise<void> {
  // Stop generations still running in the chat so they do not write to it
  // after it is gone.
  for (const run of await ctx.store.getMessageRunsByChat(chatId)) {
    abortMessageRun(run.id)
    rejectMessageRunAnswer(run.id, new Error("The chat was deleted."))
  }

  await ctx.store.deleteMessageRunsByChat(chatId)
  await ctx.store.deleteGeneratedFilesByChat(chatId)
  await ctx.store.deleteChat(chatId)
}

export async function handleChatDelete(
  ctx: AgentContext,
  chatId: Chat["id"],
): Promise<void> {
  await deleteChatWithData(ctx, chatId)
}

export async function handleChatSettingsUpdate(
  ctx: AgentContext,
  chatId: Chat["id"],
  settings: ChatSettings,
): Promise<Chat> {
  return await ctx.store.updateChatSettings(chatId, settings)
}

export async function handleChatTitleUpdate(
  ctx: AgentContext,
  chatId: Chat["id"],
  title: string,
): Promise<Chat> {
  return await ctx.store.updateChatTitle(chatId, title)
}

export async function handleChatTodoListClear(
  ctx: AgentContext,
  chatId: Chat["id"],
): Promise<void> {
  await ctx.store.updateChatTodoList(chatId, null)
}

export async function handleChatTokenEstimateGet(
  ctx: AgentContext,
  chatId?: Chat["id"] | null,
): Promise<null | number> {
  if (!chatId) {
    return null
  }

  const [chat, messageRuns] = await Promise.all([
    ctx.store.getChatById(chatId),
    ctx.store.getMessageRunsByChat(chatId),
  ])

  return estimateChatTokens(
    messageRuns,
    getValidHistorySummary(chat, messageRuns),
  )
}

/**
 * Size of the next request: the prompt of the latest measured request plus
 * everything generated since (its reply and later replies). Tool results
 * are part of the measured prompt of the request that follows them.
 *
 * Requests measured before the history `summary` was written no longer
 * match what is sent: until the next one, the summary and the runs after it
 * are estimated from their text.
 */
export function estimateChatTokens(
  messageRuns: MessageRun[],
  summary?: ChatHistorySummary,
): null | number {
  const messages = messageRuns.flatMap((run) => run.assistantMessages)
  const lastMeasuredIndex = messages.findLastIndex(
    (message) =>
      message.role === "assistant" &&
      message.promptTokens !== undefined &&
      (!summary || message.createdAt > summary.createdAt),
  )

  if (summary && lastMeasuredIndex === -1) {
    const throughIndex = messageRuns.findIndex(
      ({ id }) => id === summary.throughRunId,
    )

    return messageRuns
      .slice(throughIndex + 1)
      .reduce(
        (total, run) => total + estimateRunTokens(run),
        summary.tokenCount,
      )
  }

  if (lastMeasuredIndex !== -1) {
    const lastMeasured = messages[lastMeasuredIndex] as MessageAssistant

    return messages
      .slice(lastMeasuredIndex)
      .reduce(
        (total, message) => total + (message.tokenCount ?? 0),
        lastMeasured.promptTokens ?? 0,
      )
  }

  // Runs saved before prompt tokens were recorded per request only know the
  // prompt of each run's first request.
  const lastMeasuredRun = messageRuns.findLast(
    (run) => run.userMessage.tokenCount !== undefined,
  )

  if (!lastMeasuredRun) {
    return null
  }

  return messageRuns
    .slice(messageRuns.indexOf(lastMeasuredRun))
    .flatMap((run) => run.assistantMessages)
    .reduce(
      (total, message) => total + (message.tokenCount ?? 0),
      lastMeasuredRun.userMessage.tokenCount ?? 0,
    )
}
