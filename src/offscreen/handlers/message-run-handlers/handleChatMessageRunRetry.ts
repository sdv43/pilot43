import type { MessageRun } from "@/shared/api"

import {
  getMessageRunById,
  getModelProviderById,
  updateChatTimestamp,
  updateMessageRun,
} from "../../storage"
import { abortMessageRunAndWait } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { generateResponse } from "./utils/generateResponse"
import { notifySidepanel } from "./utils/notifySidepanel"

export async function handleChatMessageRunRetry(
  id: MessageRun["id"],
): Promise<void> {
  // Stop any in-flight generation (or one paused on a user answer) first so
  // the old loop cannot overwrite the reset state or keep running unstoppably.
  const settled = abortMessageRunAndWait(id)
  rejectMessageRunAnswer(id, new Error("Message run was retried by the user."))
  await settled

  // Get the message run (after the old loop has finished writing)
  const messageRun = await getMessageRunById(id)
  if (!messageRun) {
    throw new Error("Message run not found")
  }

  // Get the provider
  const provider = await getModelProviderById(messageRun.modelMeta.provider)
  if (!provider) {
    throw new Error("Model provider not found")
  }

  // Reset the message run
  messageRun.assistantMessages = []
  messageRun.userMessage.tokenCount = undefined
  messageRun.status = "pending"
  messageRun.error = null
  messageRun.updatedAt = Date.now()
  await updateMessageRun(messageRun)
  await updateChatTimestamp(messageRun.chatId, messageRun.updatedAt)
  notifySidepanel(messageRun.chatId, messageRun.id)

  // Start generation again
  await generateResponse(
    messageRun.chatId,
    messageRun.id,
    messageRun.modelMeta.name,
    provider,
    messageRun.modelMeta.settings,
  )
}
