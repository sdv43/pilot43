import type { MessageRun } from "@/shared/api"

import {
  getMessageRunById,
  updateChatTimestamp,
  updateMessageRun,
} from "../../storage"
import { abortMessageRun } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { notifySidepanel } from "./utils/notifySidepanel"

export async function handleChatMessageRunStop(
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
  const messageRun = await getMessageRunById(id)
  if (messageRun && messageRun.status !== "completed") {
    messageRun.status = "stopped"
    messageRun.updatedAt = Date.now()
    await updateMessageRun(messageRun)
    await updateChatTimestamp(messageRun.chatId, messageRun.updatedAt)
    notifySidepanel(messageRun.chatId, messageRun.id)
  }
}
