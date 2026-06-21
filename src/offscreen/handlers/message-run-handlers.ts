import type {
  Chat,
  ChatSettings,
  MessageRun,
  MessageUser,
  ModelProviderModel,
  Workspace,
} from "@/shared/api"

import {
  createMessageRun,
  deleteMessageRun,
  deleteMessageRunsAfter,
  getMessageRunById,
  getMessageRunsByChat,
  getModelProviderById,
  updateChatTimestamp,
  updateMessageRun,
} from "../storage"
import { abortMessageRun } from "./utils/abort-registry"
import {
  rejectMessageRunAnswer,
  resolveMessageRunAnswer,
} from "./utils/await-registry"
import { ensureChatForMessage } from "./utils/chat"
import { notifySidepanel } from "./utils/notification"
import { generateResponse } from "./utils/response-streaming"

export async function handleChatMessageSend(
  chatId: Chat["id"],
  message: Pick<
    MessageUser,
    "attachmentReferences" | "attachments" | "commandReference" | "content"
  >,
  model: Pick<ModelProviderModel, "name" | "providerId">,
  workspaceId: Workspace["id"],
  initialSettings?: ChatSettings,
): Promise<MessageUser> {
  // Get the model provider
  const provider = await getModelProviderById(model.providerId)
  if (!provider) {
    throw new Error("Model provider not found")
  }

  const messageRunId = crypto.randomUUID()

  // Create user message
  const userMessage: MessageUser = {
    id: crypto.randomUUID(),
    messageRunId,
    role: "user",
    attachmentReferences: message.attachmentReferences,
    commandReference: message.commandReference,
    content: message.content,
    attachments: message.attachments,
    createdAt: Date.now(),
  }

  const chat = await ensureChatForMessage(
    chatId,
    workspaceId,
    model.name,
    provider,
    userMessage,
    initialSettings,
  )

  // Create message run
  const messageRun: MessageRun = {
    id: messageRunId,
    chatId: chat.id,
    userMessage: { ...userMessage },
    assistantMessages: [],
    status: "pending",
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelMeta: {
      name: model.name,
      provider: model.providerId,
      settings: {},
    },
  }

  // Save to database
  await createMessageRun(messageRun)
  await updateChatTimestamp(chat.id, messageRun.updatedAt)

  // Notify sidepanel
  notifySidepanel(chat.id, messageRun.id)

  // Start async generation (don't await)
  generateResponse(chat.id, messageRun.id, model.name, provider).catch(
    (error) => {
      console.error("Error generating response:", error)
    },
  )

  return userMessage
}

export async function handleChatMessageRunGet(
  chatId: Chat["id"],
): Promise<MessageRun[]> {
  return (await getMessageRunsByChat(chatId)).sort(
    (a, b) => a.createdAt - b.createdAt,
  )
}

export async function handleChatMessageRunDelete(
  id: MessageRun["id"],
): Promise<void> {
  await deleteMessageRun(id)
}

/**
 * Rolls the chat history back to (and including) the given message run by
 * deleting every run that was created after it. Any in-progress generation is
 * aborted first. The anchor run itself is kept so the conversation can continue
 * from that point.
 */
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

/**
 * Submits the user's answer to a prompt that paused a message run — either a
 * follow-up question (see the `ask_followup_question` tool) or the round-trip
 * continuation confirmation. Resolves the paused generation loop so it
 * continues (or stops, depending on the answer). If the run is not currently
 * awaiting input this is a no-op.
 */
export async function handleChatMessageRunAnswer(
  id: MessageRun["id"],
  answer: string,
): Promise<void> {
  const messageRun = await getMessageRunById(id)
  if (!messageRun || messageRun.status !== "awaiting_input") {
    return
  }

  resolveMessageRunAnswer(id, answer)
}

export async function handleChatMessageRunRetry(
  id: MessageRun["id"],
): Promise<void> {
  // Get the message run
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
  )
}
