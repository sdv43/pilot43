import type {
  Chat,
  ChatSettings,
  MessageRun,
  MessageUser,
  ModelProviderModel,
  ModelRunSettings,
  Workspace,
} from "@pilot43/protocol"

import type { AgentContext } from "../../context"

import { ensureChatForMessage } from "./utils/ensureChatForMessage"
import { generateResponse } from "./utils/generateResponse"
import { notifyMessageRunUpdated } from "./utils/notify"

export async function handleChatMessageSend(
  ctx: AgentContext,
  chatId: Chat["id"],
  message: Pick<
    MessageUser,
    "attachmentReferences" | "attachments" | "commandReference" | "content"
  >,
  model: Pick<ModelProviderModel, "name" | "providerId">,
  workspaceId: Workspace["id"],
  initialSettings?: ChatSettings,
  modelSettings?: ModelRunSettings,
): Promise<MessageUser> {
  // Get the model provider
  const provider = await ctx.store.getModelProviderById(model.providerId)
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
      settings: modelSettings ?? {},
    },
  }

  const chat = await ensureChatForMessage(
    ctx,
    chatId,
    workspaceId,
    model.name,
    provider,
    messageRun.userMessage,
    initialSettings,
  )

  messageRun.chatId = chat.id

  // Save to database
  await ctx.store.createMessageRun(messageRun)
  await ctx.store.updateChatTimestamp(chat.id, messageRun.updatedAt)

  // Notify sidepanel
  notifyMessageRunUpdated(ctx, chat.id, messageRun.id)

  // Start async generation (don't await)
  generateResponse(
    ctx,
    chat.id,
    messageRun.id,
    model.name,
    provider,
    messageRun.modelMeta.settings,
  ).catch((error) => {
    console.error("Error generating response:", error)
  })

  return messageRun.userMessage
}
