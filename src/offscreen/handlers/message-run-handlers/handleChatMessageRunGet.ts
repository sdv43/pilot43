import type { Chat, MessageRun } from "@pilot43/protocol"

import { getMessageRunsByChat } from "../../storage"

export async function handleChatMessageRunGet(
  chatId: Chat["id"],
): Promise<MessageRun[]> {
  return await getMessageRunsByChat(chatId)
}
