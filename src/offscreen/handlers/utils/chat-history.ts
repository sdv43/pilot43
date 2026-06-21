import type {
  Chat,
  Command,
  MessageAssistant,
  MessageRun,
  MessageUser,
  MessageUserAnswer,
} from "@/shared/api"

import {
  type ChatAssistantMessage,
  type ChatMessage,
  type ChatToolCall,
  type ChatToolMessage,
} from "@/offscreen/models"
import {
  getUserMessageImageAttachments,
  serializeUserMessageContent,
} from "@/shared/api"

import { extensionSystemMessage } from "../const"

export function buildConversationHistory(
  messageRuns: MessageRun[],
  chat: Chat | undefined,
  commands: Command[],
): ChatMessage[] {
  const conversation: ChatMessage[] = [
    {
      content: extensionSystemMessage(),
      role: "system",
    },
    ...messageRuns.flatMap((run) => [
      ...toConversationMessages(run.userMessage, commands),
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
  commands: Command[] = [],
): ChatMessage[] {
  if (message.role === "user" || message.role === "user_answer") {
    // User answers to follow-up questions have no attachments; serialize them
    // as plain user content so the model sees them in the conversation.
    if (message.role === "user_answer") {
      return [{ content: message.content, role: "user" }]
    }
    return [toChatMessage(message, commands)]
  }

  const toolCalls = message.tools.map(
    (tool, toolIndex): ChatToolCall => ({
      arguments: JSON.stringify(tool.args ?? {}),
      id: getStoredToolCallId(message, toolIndex),
      name: tool.name,
    }),
  )

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
      content: JSON.stringify(tool.result),
      role: "tool",
      toolCallId: getStoredToolCallId(message, toolIndex),
      toolName: tool.name,
    }

    return [toolMessage]
  })

  return [assistantMessage, ...toolMessages]
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
export function toChatMessage(
  message: MessageAssistant | MessageUser,
  commands: Command[] = [],
): ChatMessage {
  if (message.role !== "user") {
    return { content: message.content, role: message.role }
  }

  const imageAttachments = getUserMessageImageAttachments(message)

  return {
    content: serializeUserMessageContent(message, commands),
    role: "user",
    ...(imageAttachments.length > 0 ? { images: imageAttachments } : {}),
  }
}
