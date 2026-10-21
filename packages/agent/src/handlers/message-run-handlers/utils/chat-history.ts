import type {
  Chat,
  FileAttachment,
  MessageAssistant,
  MessageRun,
  MessageUser,
  MessageUserAnswer,
  Prompt,
} from "@pilot43/protocol"

import {
  getBase64ByteLength,
  getToolResultImages,
  getUserMessageImageAttachments,
  replaceToolResultImages,
  serializeUserMessageContent,
} from "@pilot43/protocol"

import {
  type ChatAssistantMessage,
  type ChatMessage,
  type ChatToolCall,
  type ChatToolMessage,
  type ChatUserMessage,
} from "../../../models"

export function buildConversationHistory(
  systemPrompt: string,
  messageRuns: MessageRun[],
  chat: Chat | undefined,
  prompts: Prompt[],
): ChatMessage[] {
  const conversation: ChatMessage[] = [
    {
      content: systemPrompt,
      role: "system",
    },
    ...messageRuns.flatMap((run) => [
      ...toConversationMessages(run.userMessage, prompts),
      ...run.assistantMessages
        .slice()
        .sort((left, right) => left.createdAt - right.createdAt)
        .flatMap((entry) => toConversationMessages(entry)),
    ]),
  ]

  // Append the current todo list to the last user message so the model always
  // sees the up-to-date progress. Keeping it out of the (stable) system message
  // avoids invalidating the cached prefix on every todo update; only the
  // trailing user message changes.
  const todoList = chat?.todoList

  if (todoList && todoList.trim()) {
    const lastUserIndex = findLastIndex(
      conversation,
      (message) => message.role === "user",
    )

    if (lastUserIndex !== -1) {
      const now = new Date()
      const environmentBlock = `<environment>\n${`Current local date and time: ${now.toString()}. Current UTC date and time: ${now.toISOString()}.`}\n</environment>\n\n`
      const todoBlock = `<todo_list>\n${todoList.trim()}\n</todo_list>\n\n`

      conversation[lastUserIndex] = {
        ...conversation[lastUserIndex],
        content: `${environmentBlock}${todoBlock}${conversation[lastUserIndex].content}`,
      }
    }
  }

  return conversation
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index
    }
  }
  return -1
}

export function toConversationMessages(
  message: MessageAssistant | MessageUser | MessageUserAnswer,
  prompts: Prompt[] = [],
): ChatMessage[] {
  if (message.role === "user" || message.role === "user_answer") {
    // User answers to follow-up questions have no attachments; serialize them
    // as plain user content so the model sees them in the conversation.
    if (message.role === "user_answer") {
      return [{ content: message.content, role: "user" }]
    }
    return [toChatMessage(message, prompts)]
  }

  const toolCalls = message.tools.map((tool, toolIndex): ChatToolCall => ({
    arguments: JSON.stringify(tool.args ?? {}),
    id: getStoredToolCallId(message, toolIndex),
    name: tool.name,
  }))

  const assistantMessage: ChatAssistantMessage = {
    content: message.content,
    role: "assistant",
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
  }

  const toolMessages = message.tools.flatMap((tool, toolIndex) => {
    if (tool.result === null) {
      return []
    }

    const toolMessage: ChatToolMessage = {
      content: JSON.stringify(
        replaceToolResultImages(
          tool.result,
          (images) =>
            `${images.length} ${images.length === 1 ? "image" : "images"}, attached in the next user message`,
        ),
      ),
      role: "tool",
      toolCallId: getStoredToolCallId(message, toolIndex),
      toolName: tool.name,
    }

    return [toolMessage]
  })

  const imagesMessage = toToolImagesMessage(message)

  return [
    assistantMessage,
    ...toolMessages,
    ...(imagesMessage ? [imagesMessage] : []),
  ]
}

/**
 * Tool messages can't carry images with every provider, so images returned by
 * the tool calls (see `ToolResultImage`) follow them as one user message.
 */
function toToolImagesMessage(
  message: MessageAssistant,
): ChatUserMessage | undefined {
  const lines: string[] = []
  const images: FileAttachment[] = []

  message.tools.forEach((tool, toolIndex) => {
    const toolImages = getToolResultImages(tool.result)

    if (toolImages.length === 0) {
      return
    }

    const callId = getStoredToolCallId(message, toolIndex)
    lines.push(
      `- \`${tool.name}\` (call ${callId}): ${toolImages.length} ${toolImages.length === 1 ? "image" : "images"}`,
    )
    toolImages.forEach((image, imageIndex) => {
      images.push({
        content: image.data,
        mediaType: image.mimeType,
        name: `${tool.name}-${imageIndex + 1}.${image.mimeType.split("/")[1]}`,
        size: getBase64ByteLength(image.data),
        type: "file",
      })
    })
  })

  if (images.length === 0) {
    return undefined
  }

  return {
    content: `Images returned by the tool calls above, in order:\n${lines.join("\n")}`,
    images,
    role: "user",
  }
}

function getStoredToolCallId(
  message: MessageAssistant,
  toolIndex: number,
): string {
  return message.tools[toolIndex]?.id ?? `${message.id}-tool-${toolIndex}`
}

// Convert stored messages into the flattened chat format expected by the model.
// User messages with attachments are serialized as an attachment registry plus
// a user request body that can reference attachments by id. Image files are also
// passed through the model-specific multimodal fields.
function toChatMessage(
  message: MessageAssistant | MessageUser,
  prompts: Prompt[] = [],
): ChatMessage {
  if (message.role !== "user") {
    return { content: message.content, role: message.role }
  }

  const imageAttachments = getUserMessageImageAttachments(message)

  return {
    content: serializeUserMessageContent(message, prompts),
    role: "user",
    ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
  }
}
