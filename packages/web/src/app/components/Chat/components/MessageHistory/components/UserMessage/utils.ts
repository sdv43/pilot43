import type { MessageUser } from "@pilot43/protocol"

export function getAttachmentLabel(
  attachment: MessageUser["attachments"][number],
) {
  return (
    (attachment.type === "file" ? attachment.name : attachment.title) ??
    "Attachment"
  )
}
