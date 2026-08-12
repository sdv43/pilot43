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
  getModelProviderById,
  updateChatTimestamp,
} from "../../storage"
import { ensureChatForMessage } from "./utils/ensureChatForMessage"
import { generateResponse } from "./utils/generateResponse"
import { notifySidepanel } from "./utils/notifySidepanel"

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

  // Create message run
  const messageRun: MessageRun = {
    id: messageRunId,
    chatId: "",
    userMessage: {
      id: crypto.randomUUID(),
      messageRunId,
      role: "user",
      attachmentReferences: message.attachmentReferences,
      commandReference: message.commandReference,
      content: message.content,
      attachments: message.attachments,
      createdAt: Date.now(),
    },
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

  const chat = await ensureChatForMessage(
    chatId,
    workspaceId,
    model.name,
    provider,
    messageRun.userMessage,
    initialSettings,
  )

  messageRun.chatId = chat.id

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

  return messageRun.userMessage
}
