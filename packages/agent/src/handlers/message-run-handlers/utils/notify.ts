import type { Chat, MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../../context"

export function notifyMessageRunUpdated(
  ctx: AgentContext,
  chatId: Chat["id"],
  messageRunId: MessageRun["id"],
) {
  ctx.notifier.notify({
    action: "messageRunUpdated",
    payload: { chatId, messageRunId },
  })
}
