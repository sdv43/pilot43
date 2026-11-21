import type { MessageRun } from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { abortMessageRunAndWait } from "./utils/abort-registry"
import { generateResponse } from "./utils/generateResponse"
import { invalidateHistorySummary } from "./utils/history-summary"
import { notifyMessageRunUpdated } from "./utils/notify"

/** Result recorded for a call that never finished before the run ended. */
export const interruptedToolResult = {
  error:
    "The call was interrupted before it finished. It may or may not have taken effect; check before making it again.",
  ok: false,
}

/**
 * Continues a stopped or failed run from where it ended (see
 * `BackendApi.chatMessageRunResume`). Only the chat's last run can be
 * resumed, since the history sent to the model ends with it.
 */
export async function handleChatMessageRunResume(
  ctx: AgentContext,
  id: MessageRun["id"],
): Promise<void> {
  // A loop that is still unwinding after a stop must not overwrite the
  // prepared state.
  await abortMessageRunAndWait(id)

  const messageRun = await ctx.store.getMessageRunById(id)
  if (!messageRun) {
    throw new Error("Message run not found")
  }

  if (messageRun.status !== "stopped" && messageRun.status !== "failed") {
    throw new Error("Only stopped or failed runs can be resumed")
  }

  const runs = await ctx.store.getMessageRunsByChat(messageRun.chatId)
  if (runs.at(-1)?.id !== messageRun.id) {
    throw new Error("Only the last run of a chat can be resumed")
  }

  const provider = await ctx.store.getModelProviderById(
    messageRun.modelMeta.provider,
  )
  if (!provider) {
    throw new Error("Model provider not found")
  }

  // `/compact` may have summarised the run; it goes on in full instead.
  await invalidateHistorySummary(ctx, messageRun.chatId, messageRun.id)

  prepareRunForResume(messageRun)

  messageRun.status = "pending"
  messageRun.error = null
  messageRun.completedAt = undefined
  messageRun.continuationPrompt = null
  messageRun.followupQuestion = null
  messageRun.toolApproval = null
  delete messageRun.interrupted
  messageRun.updatedAt = Date.now()
  await ctx.store.updateMessageRun(messageRun)
  await ctx.store.updateChatTimestamp(messageRun.chatId, messageRun.updatedAt)
  notifyMessageRunUpdated(ctx, messageRun.chatId, messageRun.id)

  await generateResponse(
    ctx,
    messageRun.chatId,
    messageRun.id,
    messageRun.modelMeta.name,
    provider,
    messageRun.modelMeta.settings,
  )
}

/**
 * Leaves the run's history in a state the model can continue from: calls
 * that never finished get {@link interruptedToolResult}, and a last reply
 * without tool calls (cut off mid-stream, since a finished one completes the
 * run) is dropped so it is generated again.
 */
export function prepareRunForResume(messageRun: MessageRun) {
  const last = messageRun.assistantMessages.at(-1)

  if (last?.role === "assistant" && last.tools.length === 0) {
    messageRun.assistantMessages.pop()
  }

  for (const entry of messageRun.assistantMessages) {
    if (entry.role !== "assistant") {
      continue
    }

    for (const tool of entry.tools) {
      if (
        tool.result === null ||
        tool.status === "running" ||
        tool.status === "awaiting_approval"
      ) {
        tool.result = interruptedToolResult
        tool.status = "failed"
      }
    }
  }
}
