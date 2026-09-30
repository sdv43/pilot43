import type { MessageRun } from "@/shared/api"

import {
  deleteMessageRunsAfter,
  getMessageRunById,
  updateChatTimestamp,
} from "../../storage"
import { abortMessageRun } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { notifySidepanel } from "./utils/notifySidepanel"

export async function handleChatMessageRunDeleteAfter(
  id: MessageRun["id"],
): Promise<void> {
  const target = await getMessageRunById(id)
  if (!target) {
    return
  }

  const deletedRuns = await deleteMessageRunsAfter(id)

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
    await updateChatTimestamp(target.chatId, Date.now())
    // Notify the sidepanel that the chat history changed so it re-fetches the
    // remaining runs. We reference the anchor run id for the notification.
    notifySidepanel(target.chatId, target.id)
  }
}
