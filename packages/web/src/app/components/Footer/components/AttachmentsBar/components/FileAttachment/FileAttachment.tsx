import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { footerActions } from "../../../../store"
import { type FileAttachmentProps } from "./types"

export function FileAttachment({ attachment }: FileAttachmentProps) {
  const file =
    attachment.attachment?.type === "file" ? attachment.attachment : undefined

  const label = attachment.isLoading
    ? "loading..."
    : (file?.name ?? attachment.label ?? "No name")

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      errorMessage={attachment.errorMessage}
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
      onRemove={() => footerActions.removeAttachment(attachment.key)}
    />
  )
}
