import type { Chat, MessageRun } from "@/shared/api"

import { getMessageRunsByChat } from "../../storage"

export async function handleChatMessageRunGet(
  chatId: Chat["id"],
): Promise<MessageRun[]> {
  return await getMessageRunsByChat(chatId)
}
