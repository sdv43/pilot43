import type {
  Command,
  FileAttachment,
  MessageUser,
  PageContentAttachment,
  PageContentSelectionAttachment,
} from "./entities"

const imageAttachmentPlaceholder =
  "[Image attachment provided separately to the model.]"

const dataUrlPattern = /^data:([^;,]+)?(?:;[^,]*)?,([\s\S]+)$/i

type Attachment = MessageUser["attachments"][number]

/**
 * Pattern matching a leading slash command at the very start of a message.
 * Slash commands are only valid at position 0 (see the editor's
 * `isSlashCommandStart`), so we only ever expand the first one. The command
 * name uses the same character class as the editor autocomplete.
 */
const leadingSlashCommandPattern = /^\/([\p{L}\p{N}.:_-]+)(?:\s+|$)/u

/**
 * Replaces a leading `/<name>` slash command in the user message content with
 * the matching command's prompt text. When the command is found, its prompt is
 * inserted followed by the remaining message body (if any). Unknown commands
 * are left untouched so the model sees the raw text.
 *
 * Slash commands are only recognized at the very start of the message; any
 * `/word` appearing later is treated as plain text.
 */
function expandSlashCommands(content: string, commands: Command[]): string {
  const match = content.match(leadingSlashCommandPattern)
  if (!match) {
    return content
  }

  const commandName = match[1]
  const command = commands.find((candidate) => candidate.name === commandName)

  if (!command) {
    return content
  }

  const rest = content.slice(match[0].length)

  return rest.length > 0 ? `${command.prompt}\n\n${rest}` : command.prompt
}

function isImageFileAttachment(
  attachment: Attachment,
): attachment is FileAttachment {
  return attachment.type === "file" && isImageMediaType(attachment.mediaType)
}

function isImageMediaType(mediaType: string) {
  return mediaType.startsWith("image/")
}

function getImageAttachmentText(attachment: FileAttachment): string {
  return `${imageAttachmentPlaceholder} Name: ${attachment.name}. Media type: ${attachment.mediaType}.`
}

function serializeAttachment(
  attachment:
    | FileAttachment
    | PageContentAttachment
    | PageContentSelectionAttachment,
  id: string,
): string {
  if (attachment.type === "file") {
    const content = isImageMediaType(attachment.mediaType)
      ? getImageAttachmentText(attachment)
      : attachment.content

    return `<attachment id="${id}" type="file" name="${attachment.name}" mediaType="${attachment.mediaType}">\n${content}\n</attachment>`
  }

  if (attachment.type === "page-content") {
    const text = attachment.textContent ?? attachment.content ?? ""
    const title = attachment.title ?? ""
    return `<attachment id="${id}" type="page-content" title="${title}" url="${attachment.url}" >\n${text}\n</attachment>`
  }

  return `<attachment id="${id}" type="page-content-selection" title="${attachment.title}" description="${attachment.description}" url="${attachment.url}">\n${attachment.content}\n</attachment>`
}

function getFallbackAttachmentId(
  attachment:
    | FileAttachment
    | PageContentAttachment
    | PageContentSelectionAttachment,
): string {
  if (attachment.type === "file") {
    return `file:${attachment.name}`
  }

  if (attachment.type === "page-content") {
    return `page:${attachment.id}`
  }

  return `selection:${attachment.uniqueKey}`
}

function buildAttachmentIdByIndex(
  attachments: MessageUser["attachments"],
  references: NonNullable<MessageUser["attachmentReferences"]>,
): Map<number, string> {
  const requestedIdByAttachmentIndex = new Map<number, string>()

  references.forEach((reference) => {
    if (!requestedIdByAttachmentIndex.has(reference.attachmentIndex)) {
      requestedIdByAttachmentIndex.set(reference.attachmentIndex, reference.id)
    }
  })

  const usedIds = new Map<string, number>()
  const attachmentIdByIndex = new Map<number, string>()

  attachments.forEach((attachment, attachmentIndex) => {
    const baseId =
      requestedIdByAttachmentIndex.get(attachmentIndex) ??
      getFallbackAttachmentId(attachment)
    const nextCount = (usedIds.get(baseId) ?? 0) + 1

    usedIds.set(baseId, nextCount)
    attachmentIdByIndex.set(
      attachmentIndex,
      nextCount === 1 ? baseId : `${baseId}-${nextCount}`,
    )
  })

  return attachmentIdByIndex
}

function replaceAttachmentReferences(
  content: string,
  references: NonNullable<MessageUser["attachmentReferences"]>,
  attachmentIdByIndex: Map<number, string>,
): string {
  if (references.length === 0) {
    return content
  }

  const sortedReferences = [...references].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  )
  let cursor = 0
  let result = ""

  sortedReferences.forEach((reference) => {
    const attachmentId = attachmentIdByIndex.get(reference.attachmentIndex)

    if (
      !attachmentId ||
      reference.start < cursor ||
      reference.start < 0 ||
      reference.end <= reference.start ||
      reference.end > content.length
    ) {
      return
    }

    result += content.slice(cursor, reference.start)
    result += `#${attachmentId}`
    cursor = reference.end
  })

  return `${result}${content.slice(cursor)}`
}

export function getUserMessageImageAttachments(
  message: Pick<MessageUser, "attachments">,
): FileAttachment[] {
  return message.attachments.filter(isImageFileAttachment)
}

export function getFileAttachmentBase64Content(
  attachment: Pick<FileAttachment, "content">,
): string {
  const match = attachment.content.match(dataUrlPattern)

  return match?.[2] ?? attachment.content
}

export function getFileAttachmentDataUrl(
  attachment: Pick<FileAttachment, "content" | "mediaType">,
): string {
  if (attachment.content.startsWith("data:")) {
    return attachment.content
  }

  return `data:${attachment.mediaType};base64,${attachment.content}`
}

export function serializeUserMessageContent(
  message: Pick<
    MessageUser,
    "attachmentReferences" | "attachments" | "content"
  >,
  commands: Command[] = [],
): string {
  if (message.attachments.length === 0) {
    return `<userRequest>\n${message.content}\n</userRequest>`
  }

  const attachmentIdByIndex = buildAttachmentIdByIndex(
    message.attachments,
    message.attachmentReferences ?? [],
  )

  const attachmentText = message.attachments
    .map((attachment, attachmentIndex) =>
      serializeAttachment(
        attachment,
        attachmentIdByIndex.get(attachmentIndex) ??
          getFallbackAttachmentId(attachment),
      ),
    )
    .join("\n\n")

  const requestContent = expandSlashCommands(
    replaceAttachmentReferences(
      message.content,
      message.attachmentReferences ?? [],
      attachmentIdByIndex,
    ),
    commands,
  )

  if (!requestContent) {
    return `<attachments>\n${attachmentText}\n</attachments>`
  }

  return `<attachments>\n${attachmentText}\n</attachments>\n\n<userRequest>\n${requestContent}\n</userRequest>`
}
