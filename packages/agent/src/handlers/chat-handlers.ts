import type { Chat, ChatSettings, Workspace } from "@pilot43/protocol"

import type { AgentContext } from "../context"

export async function handleChatGetByWorkspace(
  ctx: AgentContext,
  workspaceId: Workspace["id"],
): Promise<Chat[]> {
  return await ctx.store.getChatsByWorkspace(workspaceId)
}

export async function handleChatDelete(
  ctx: AgentContext,
  chatId: Chat["id"],
): Promise<void> {
  // Delete associated message runs first
  await ctx.store.deleteMessageRunsByChat(chatId)
  // Delete files generated via the `generate_file` tool
  await ctx.store.deleteGeneratedFilesByChat(chatId)
  // Then delete the chat
  await ctx.store.deleteChat(chatId)
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

  const messageRuns = await ctx.store.getMessageRunsByChat(chatId)

  if (messageRuns.length === 0) {
    return null
  }

  // The last user message tokenCount holds the provider-reported prompt
  // tokens of the most recent completed request. When it is not available
  // (run is in progress, failed or retried), fall back to the closest
  // previous run that has one.
  const lastMeasuredRun = [...messageRuns]
    .reverse()
    .find((run) => run.userMessage.tokenCount !== undefined)

  if (!lastMeasuredRun) {
    return null
  }

  // The next prompt will include the assistant replies produced after the
  // last measured request, so add their token counts on top.
  const runsAfterMeasurement = messageRuns.slice(
    messageRuns.indexOf(lastMeasuredRun) + 1,
  )

  let total = lastMeasuredRun.userMessage.tokenCount ?? 0
  for (const run of [lastMeasuredRun, ...runsAfterMeasurement]) {
    for (const msg of run.assistantMessages) {
      total += msg.tokenCount ?? 0
    }
  }

  return total
}
