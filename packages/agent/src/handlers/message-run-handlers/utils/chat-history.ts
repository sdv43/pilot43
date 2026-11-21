import type {
  Chat,
  FileAttachment,
  MessageAssistant,
  MessageAssistantTool,
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

/**
 * Characters of tool results from earlier runs sent in full, counted from the
 * most recent. Larger results beyond it are replaced with a short note so long
 * chats don't resend every page and response they ever read.
 */
export const historyToolResultBudget = 60_000

/** Tool results shorter than this are always sent in full. */
export const minElidedToolResultLength = 1000

/** Characters an image returned by a tool counts as against the budget. */
const toolResultImageCost = 5000

interface ConversationMessageOptions {
  /** Tool calls whose results are replaced with a note (and images dropped). */
  elidedTools?: ReadonlySet<MessageAssistantTool>
  /** Send the reply's reasoning back (only while its run continues). */
  withReasoning?: boolean
}

export function buildConversationHistory(
  systemPrompt: string,
  messageRuns: MessageRun[],
  chat: Chat | undefined,
  prompts: Prompt[],
): ChatMessage[] {
  const elidedTools = getElidedTools(messageRuns.slice(0, -1))

  const conversation: ChatMessage[] = [
    {
      content: systemPrompt,
      role: "system",
    },
    ...messageRuns.flatMap((run, runIndex) => {
      // The run being generated is the last one; only its replies carry
      // their reasoning (an earlier run may have used another model).
      const withReasoning = runIndex === messageRuns.length - 1

      return [
        ...toConversationMessages(run.userMessage, prompts),
        ...sortByCreatedAt(run.assistantMessages).flatMap((entry) =>
          toConversationMessages(entry, prompts, {
            elidedTools,
            withReasoning,
          }),
        ),
      ]
    }),
  ]

  // Add the todo list to the last user message, out of the (stable) system
  // message. It is added once per run: within a run the model follows the
  // list through its own `update_todo_list` calls, whose results echo it.
  // Refreshing it on every request would change an earlier message and
  // invalidate the provider's prompt cache.
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

function sortByCreatedAt<T extends { createdAt: number }>(entries: T[]): T[] {
  return entries.slice().sort((left, right) => left.createdAt - right.createdAt)
}

/**
 * Picks the tool calls of earlier runs whose results are replaced with a note:
 * walking back from the most recent call, results of at least
 * {@link minElidedToolResultLength} characters once the
 * {@link historyToolResultBudget} is used up.
 */
function getElidedTools(earlierRuns: MessageRun[]): Set<MessageAssistantTool> {
  const elided = new Set<MessageAssistantTool>()
  let used = 0

  const tools = earlierRuns.flatMap((run) =>
    sortByCreatedAt(run.assistantMessages).flatMap((entry) =>
      entry.role === "assistant" ? entry.tools : [],
    ),
  )

  for (const tool of tools.reverse()) {
    if (tool.result === null) {
      continue
    }

    const size = getToolResultSize(tool.result)
    used += size

    if (used > historyToolResultBudget && size >= minElidedToolResultLength) {
      elided.add(tool)
    }
  }

  return elided
}

function getToolResultSize(result: Record<string, unknown>): number {
  const images = getToolResultImages(result)
  const text = JSON.stringify(
    images.length > 0 ? replaceToolResultImages(result, () => "") : result,
  )

  return text.length + images.length * toolResultImageCost
}

function getElidedToolResult(result: Record<string, unknown>) {
  return {
    ...(typeof result.ok === "boolean" ? { ok: result.ok } : {}),
    elided: `This result of an earlier turn (${getToolResultSize(result)} characters) was removed to save context. Call the tool again if you need it.`,
  }
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
  { elidedTools, withReasoning = false }: ConversationMessageOptions = {},
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

  const reasoning =
    withReasoning && (message.reasoningDetails?.length || message.thoughts)
      ? {
          ...(message.reasoningDetails?.length
            ? { details: message.reasoningDetails }
            : {}),
          ...(message.thoughts ? { text: message.thoughts } : {}),
        }
      : undefined

  const assistantMessage: ChatAssistantMessage = {
    content: message.content,
    role: "assistant",
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
    ...(reasoning ? { reasoning } : {}),
  }

  const toolMessages = message.tools.flatMap((tool, toolIndex) => {
    if (tool.result === null) {
      return []
    }

    const toolMessage: ChatToolMessage = {
      content: JSON.stringify(
        elidedTools?.has(tool)
          ? getElidedToolResult(tool.result)
          : replaceToolResultImages(
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

  const imagesMessage = toToolImagesMessage(message, elidedTools)

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
  elidedTools?: ReadonlySet<MessageAssistantTool>,
): ChatUserMessage | undefined {
  const lines: string[] = []
  const images: FileAttachment[] = []

  message.tools.forEach((tool, toolIndex) => {
    const toolImages = elidedTools?.has(tool)
      ? []
      : getToolResultImages(tool.result)

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
