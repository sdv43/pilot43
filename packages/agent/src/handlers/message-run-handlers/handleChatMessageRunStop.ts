import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { abortMessageRun } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { notifyMessageRunUpdated } from "./utils/notify"

export async function handleChatMessageRunStop(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  // If the generation is currently running, abort the in-progress stream.
  abortMessageRun(id)

  // If the run is paused waiting for an answer (follow-up question or the
  // round-trip continuation prompt), reject the pending answer promise so the
  // paused generation loop wakes up and observes the abort instead of hanging.
  rejectMessageRunAnswer(id, new Error("Message run was stopped by the user."))

  // Persist the stopped state in case the generation had not registered an
  // abort controller yet (e.g. it was still in the "pending" phase). The
  // streaming loop will reconcile the final state when it observes the abort.
  const messageRun = await ctx.store.getMessageRunById(id)
  if (messageRun && messageRun.status !== "completed") {
    messageRun.status = "stopped"
    messageRun.updatedAt = Date.now()
    await ctx.store.updateMessageRun(messageRun)
    await ctx.store.updateChatTimestamp(messageRun.chatId, messageRun.updatedAt)
    notifyMessageRunUpdated(ctx, messageRun.chatId, messageRun.id)
  }
}
