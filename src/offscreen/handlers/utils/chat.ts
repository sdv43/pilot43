import type { ModelProvider } from "@/offscreen/storage"
import type { Chat, ChatSettings, MessageUser, Workspace } from "@/shared/api"

import { createModelAdapter } from "@/offscreen/models"
import {
  createChat,
  getAppSettings,
  getChatById,
  getModelProviderById,
  getWorkspaceById,
  updateChatTitle,
  updateWorkspace,
} from "@/offscreen/storage"
import {
  TITLE_GENERATION_DISABLED,
  TITLE_GENERATION_USE_CHAT_MODEL,
} from "@/shared/api"
import { parseModelProviderModelId } from "@/shared/model-provider-utils"

import {
  generatedChatTitleMaxLength,
  titlePromptAttachmentLimit,
  titlePromptContextMaxLength,
} from "../const"

/**
 * chatId is empty string when the user is starting a new chat.
 */
export async function ensureChatForMessage(
  chatId: Chat["id"],
  workspaceId: Workspace["id"],
  modelName: string,
  provider: ModelProvider,
  userMessage: MessageUser,
  initialSettings?: ChatSettings,
): Promise<Chat> {
  if (chatId) {
    const existingChat = await getChatById(chatId)
    if (!existingChat) {
      throw new Error("Chat not found")
    }

    return existingChat
  }

  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace) {
    throw new Error("Workspace not found")
  }

  const fallbackTitle = normalizeChatTitle(userMessage.content)

  const chat = await createChat(
    workspace.id,
    fallbackTitle,
    initialSettings ?? { tools: [] },
  )

  await updateWorkspace({
    ...workspace,
    lastSelectedChatId: chat.id,
  })

  const titleModel = await resolveTitleModel(
    modelName,
    provider,
    await getAppSettings(),
  )

  if (titleModel) {
    void startTitleGeneration({
      chat,
      modelName: titleModel.modelName,
      provider: titleModel.provider,
      userMessage,
    })
  }

  return chat
}

const startTitleGeneration = async ({
  chat,
  modelName,
  provider,
  userMessage,
}: {
  chat: Chat
  modelName: string
  provider: ModelProvider
  userMessage: MessageUser
}) => {
  try {
    const title = normalizeChatTitle(
      await generateChatTitle(modelName, provider, userMessage),
    )

    if (title) {
      await updateChatTitle(chat.id, title)
    }
  } catch (error) {
    console.error("Error generating chat title:", error)
  }
}

/**
 * Resolves the model (and its provider) used to generate a chat title based on
 * the extension-wide `titleGenerationModel` setting.
 *
 * Returns `null` when title generation is disabled or the configured model is
 * no longer available.
 */
async function resolveTitleModel(
  chatModelName: string,
  chatProvider: ModelProvider,
  appSettings: {
    titleGenerationModel: string
  },
): Promise<null | { modelName: string; provider: ModelProvider }> {
  const setting = appSettings.titleGenerationModel

  if (!setting || setting === TITLE_GENERATION_DISABLED) {
    return null
  }

  if (setting === TITLE_GENERATION_USE_CHAT_MODEL) {
    return { modelName: chatModelName, provider: chatProvider }
  }

  const { modelName, providerId } = parseModelProviderModelId(setting)
  if (!providerId || !modelName) {
    return null
  }

  const provider = await getModelProviderById(providerId)
  if (!provider) {
    return null
  }

  return { modelName, provider }
}

function normalizeChatTitle(title: string): string {
  const normalizedTitle = title
    .replace(/^title:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalizedTitle) {
    return "New chat"
  }

  return normalizedTitle.slice(0, generatedChatTitleMaxLength)
}

async function generateChatTitle(
  modelName: string,
  provider: ModelProvider,
  userMessage: MessageUser,
): Promise<string> {
  const adapter = createModelAdapter(provider, modelName)
  const titleSource = serializeUserMessageTitleSource(userMessage)

  let title = ""

  for await (const chunk of adapter.chat(
    [
      {
        role: "system",
        content: `Generate a concise chat title from the first user message and attachments. Return only the title text without quotes, markdown, or explanations. Keep the title under ${generatedChatTitleMaxLength} characters.`,
      },
      {
        role: "user",
        content: `Create a short descriptive title for this conversation:\n\n${titleSource}`,
      },
    ],
    { maxTokens: 128, temperature: 0.2, thinking: false },
  )) {
    title += chunk.content

    if (chunk.done) {
      break
    }
  }

  return title
}

function serializeUserMessageTitleSource(message: MessageUser): string {
  const contentPreview = message.content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, titlePromptContextMaxLength)

  const attachmentPreview = message.attachments
    .slice(0, titlePromptAttachmentLimit)
    .map((attachment) => {
      if (attachment.type === "file") {
        return attachment.name
      }

      return attachment.title ?? ""
    })
    .filter((attachmentName) => attachmentName.length > 0)

  const parts = [contentPreview ? `Message: ${contentPreview}` : null]

  if (attachmentPreview.length > 0) {
    parts.push(`Attachments: ${attachmentPreview.join(", ")}`)
  }

  return parts.filter((part) => part !== null).join("\n") || "Message:"
}
