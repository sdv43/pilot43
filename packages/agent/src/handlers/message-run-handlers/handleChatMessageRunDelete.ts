import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { invalidateHistorySummary } from "./utils/history-summary"

export async function handleChatMessageRunDelete(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  const run = await ctx.store.getMessageRunById(id)

  if (run) {
    await invalidateHistorySummary(ctx, run.chatId, id)
  }

  await ctx.store.deleteMessageRun(id)
}
