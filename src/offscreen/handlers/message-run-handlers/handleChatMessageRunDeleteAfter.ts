import type { MessageRun } from "@/shared/api"

import {
  deleteMessageRunsAfter,
  getMessageRunById,
  updateChatTimestamp,
} from "../../storage"
import { abortMessageRun } from "./utils/abort-registry"
import { notifySidepanel } from "./utils/notifySidepanel"

export async function handleChatMessageRunDeleteAfter(
  id: MessageRun["id"],
): Promise<void> {
  const target = await getMessageRunById(id)
  if (!target) {
    return
  }

  const deletedRuns = await deleteMessageRunsAfter(id)

  // Abort any generation that is still running for the deleted runs. Runs that
  // already finished are no longer tracked and `abortMessageRun` is a no-op.
  for (const run of deletedRuns) {
    if (run.status === "running" || run.status === "pending") {
      abortMessageRun(run.id)
    }
  }

  if (deletedRuns.length > 0) {
    await updateChatTimestamp(target.chatId, Date.now())
    // Notify the sidepanel that the chat history changed so it re-fetches the
    // remaining runs. We reference the anchor run id for the notification.
    notifySidepanel(target.chatId, target.id)
  }
}
