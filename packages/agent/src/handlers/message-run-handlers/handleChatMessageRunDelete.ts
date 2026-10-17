import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

export async function handleChatMessageRunDelete(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  await ctx.store.deleteMessageRun(id)
}
