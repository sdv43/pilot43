import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { abortMessageRun } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { notifyMessageRunUpdated } from "./utils/notify"

export async function handleChatMessageRunDeleteAfter(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  const target = await ctx.store.getMessageRunById(id)
  if (!target) {
    return
  }

  const deletedRuns = await ctx.store.deleteMessageRunsAfter(id)

  // Abort any generation that is still active for the deleted runs and wake
  // up ones paused on a user answer. Runs that already finished are no longer
  // tracked, so both calls are no-ops for them.
  for (const run of deletedRuns) {
    abortMessageRun(run.id)
    rejectMessageRunAnswer(
      run.id,
      new Error("Message run was deleted by the user."),
    )
  }

  if (deletedRuns.length > 0) {
    await ctx.store.updateChatTimestamp(target.chatId, Date.now())
    // Notify the sidepanel that the chat history changed so it re-fetches the
    // remaining runs. We reference the anchor run id for the notification.
    notifyMessageRunUpdated(ctx, target.chatId, target.id)
  }
}
