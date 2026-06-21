import type { MessageUser } from "@/shared/api"

import { textFileExtensions, textMediaTypes } from "./const"

type Attachment = Partial<MessageUser["attachments"][number]>

export type AttachmentPreview =
  | {
      content: string
      kind: "text"
      meta?: string
      title: string
    }
  | {
      kind: "image"
      meta?: string
      src: string
      title: string
    }

function isTextPreviewableFile(attachment: Attachment) {
  if (attachment.type !== "file") {
    return false
  }

  const mediaType = attachment.mediaType?.toLowerCase()
  const name = attachment.name?.toLowerCase()

  return (
    (mediaType?.startsWith("text/") ?? false) ||
    (mediaType
      ? Array.from(textMediaTypes).some((type) => mediaType.startsWith(type))
      : false) ||
    (name
      ? Array.from(textFileExtensions).some((extension) =>
          name.endsWith(extension),
        )
      : false)
  )
}

function isImagePreviewableFile(attachment: Attachment) {
  return (
    attachment.type === "file" &&
    typeof attachment.mediaType === "string" &&
    attachment.mediaType.startsWith("image/")
  )
}

function getAttachmentPreviewContent(attachment: Attachment) {
  if (!attachment.type) {
    return undefined
  }

  switch (attachment.type) {
    case "file":
    case "page-content-selection":
      return attachment.content ?? undefined
    case "page-content":
      return (
        ("textContent" in attachment ? attachment.textContent : undefined) ??
        attachment.content ??
        undefined
      )
    default:
      return undefined
  }
}

export function getAttachmentPreviewTitle(
  attachment: Attachment,
  label: string,
) {
  if (!attachment.type) {
    return label
  }

  switch (attachment.type) {
    case "file":
      return attachment.name || label
    case "page-content":
    case "page-content-selection":
      return attachment.title || label
    default:
      return label
  }
}

function getAttachmentPreviewMeta(attachment: Attachment) {
  if (!attachment.type) {
    return undefined
  }

  switch (attachment.type) {
    case "file":
      return attachment.mediaType || undefined
    case "page-content":
    case "page-content-selection":
      return attachment.url || undefined
    default:
      return undefined
  }
}

export function getAttachmentPreview(
  attachment: Attachment,
  label: string,
  isLoading?: boolean,
  isError?: boolean,
  errorMessage?: string,
): AttachmentPreview | null {
  const title = getAttachmentPreviewTitle(attachment, label)
  const meta = getAttachmentPreviewMeta(attachment)

  if (isError) {
    return {
      kind: "text",
      meta,
      title,
      content: errorMessage ?? "Unknown attachment error",
    }
  }

  if (isLoading) {
    return {
      kind: "text",
      meta,
      title,
      content: "Attachment is still loading...",
    }
  }

  if (isImagePreviewableFile(attachment) && attachment.content) {
    return {
      kind: "image",
      meta,
      title,
      src: attachment.content,
    }
  }

  if (isTextPreviewableFile(attachment)) {
    return {
      kind: "text",
      meta,
      title,
      content: attachment.content || "No preview available.",
    }
  }

  if (
    attachment.type === "page-content" ||
    attachment.type === "page-content-selection"
  ) {
    return {
      kind: "text",
      meta,
      title,
      content:
        getAttachmentPreviewContent(attachment) ?? "No preview available.",
    }
  }

  return null
}
