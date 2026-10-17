import type { Chat, MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

export async function handleChatMessageRunGet(
  ctx: AgentContext,
  chatId: Chat["id"],
): Promise<MessageRun[]> {
  return await ctx.store.getMessageRunsByChat(chatId)
}
