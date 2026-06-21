import type { Chat, ChatSettings, Workspace } from "@/shared/api"

import {
  deleteChat,
  deleteMessageRunsByChat,
  getChatsByWorkspace,
  getMessageRunsByChat,
  updateChatSettings,
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
  // Then delete the chat
  await deleteChat(chatId)
}

export async function handleChatSettingsUpdate(
  chatId: Chat["id"],
  settings: ChatSettings,
): Promise<Chat> {
  return await updateChatSettings(chatId, settings)
}

export async function handleChatTodoListClear(
  chatId: Chat["id"],
): Promise<void> {
  await updateChatTodoList(chatId, null)
}

export async function handleChatTokenEstimateGet(
  chatId: Chat["id"],
): Promise<null | number> {
  const messageRuns = await getMessageRunsByChat(chatId)
  if (messageRuns.length === 0) return 0

  let total = 0
  for (const run of messageRuns) {
    // User message tokens
    const userTokens = run.userMessage.tokenCount
    total +=
      userTokens !== undefined
        ? userTokens
        : Math.ceil(run.userMessage.content.length / 4)

    // Assistant message tokens
    for (const msg of run.assistantMessages) {
      const assistantTokens = msg.tokenCount
      total +=
        assistantTokens !== undefined
          ? assistantTokens
          : Math.ceil(msg.content.length / 4)
    }
  }

  return total
}
