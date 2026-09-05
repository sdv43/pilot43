import type { Chat, ChatSettings, Workspace } from "@/shared/api"

import {
  deleteChat,
  deleteGeneratedFilesByChat,
  deleteMessageRunsByChat,
  getChatsByWorkspace,
  getMessageRunsByChat,
  updateChatSettings,
  updateChatTitle,
  updateChatTodoList,
} from "../storage"

export async function handleChatGetByWorkspace(
  workspaceId: Workspace["id"],
): Promise<Chat[]> {
  return await getChatsByWorkspace(workspaceId)
}

export async function handleChatDelete(chatId: Chat["id"]): Promise<void> {
  // Delete associated message runs first
  await deleteMessageRunsByChat(chatId)
  // Delete files generated via the `generate_file` tool
  await deleteGeneratedFilesByChat(chatId)
  // Then delete the chat
  await deleteChat(chatId)
}

export async function handleChatSettingsUpdate(
  chatId: Chat["id"],
  settings: ChatSettings,
): Promise<Chat> {
  return await updateChatSettings(chatId, settings)
}

export async function handleChatTitleUpdate(
  chatId: Chat["id"],
  title: string,
): Promise<Chat> {
  return await updateChatTitle(chatId, title)
}

export async function handleChatTodoListClear(
  chatId: Chat["id"],
): Promise<void> {
  await updateChatTodoList(chatId, null)
}

export async function handleChatTokenEstimateGet(
  chatId?: Chat["id"] | null,
): Promise<null | number> {
  if (!chatId) {
    return null
  }

  const messageRuns = await getMessageRunsByChat(chatId)

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
