import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { abortMessageRunAndWait } from "./utils/abort-registry"
import { rejectMessageRunAnswer } from "./utils/await-registry"
import { generateResponse } from "./utils/generateResponse"
import { notifyMessageRunUpdated } from "./utils/notify"

export async function handleChatMessageRunRetry(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  // Stop any in-flight generation (or one paused on a user answer) first so
  // the old loop cannot overwrite the reset state or keep running unstoppably.
  const settled = abortMessageRunAndWait(id)
  rejectMessageRunAnswer(id, new Error("Message run was retried by the user."))
  await settled

  // Get the message run (after the old loop has finished writing)
  const messageRun = await ctx.store.getMessageRunById(id)
  if (!messageRun) {
    throw new Error("Message run not found")
  }

  // Get the provider
  const provider = await ctx.store.getModelProviderById(
    messageRun.modelMeta.provider,
  )
  if (!provider) {
    throw new Error("Model provider not found")
  }

  // Reset the message run
  messageRun.assistantMessages = []
  messageRun.userMessage.tokenCount = undefined
  messageRun.status = "pending"
  messageRun.error = null
  messageRun.completedAt = undefined
  messageRun.continuationPrompt = null
  messageRun.followupQuestion = null
  messageRun.toolApproval = null
  messageRun.updatedAt = Date.now()
  await ctx.store.updateMessageRun(messageRun)
  await ctx.store.updateChatTimestamp(messageRun.chatId, messageRun.updatedAt)
  notifyMessageRunUpdated(ctx, messageRun.chatId, messageRun.id)

  // Start generation again
  await generateResponse(
    ctx,
    messageRun.chatId,
    messageRun.id,
    messageRun.modelMeta.name,
    provider,
    messageRun.modelMeta.settings,
  )
}
