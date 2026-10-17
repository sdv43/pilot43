import type { FollowupAnswer, MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { resolveMessageRunAnswer } from "./utils/await-registry"

export async function handleChatMessageRunAnswer(
  ctx: AgentContext,
  id: MessageRun["id"],
  answer: string,
  answers?: FollowupAnswer[],
): Promise<void> {
  const messageRun = await ctx.store.getMessageRunById(id)
  if (!messageRun || messageRun.status !== "awaiting_input") {
    return
  }

  resolveMessageRunAnswer(id, { answers, text: answer })
}
