import { FileIcon } from "lucide-react"

import { AttachmentBadge, Loader } from "@/sidepanel/app/components"

import s from "./FileAttachment.module.css"
import { type FileAttachmentProps } from "./types"

export function FileAttachment({ attachment }: FileAttachmentProps) {
  const file =
    attachment.attachment?.type === "file" ? attachment.attachment : undefined

  const icon = attachment.isLoading ? (
    <Loader size={14} />
  ) : (
    <FileIcon size={14} />
  )

  const label = attachment.isLoading
    ? "loading..."
    : (file?.name ?? attachment.label ?? "No name")

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      className={s.fileAttachment}
      errorMessage={attachment.errorMessage}
      icon={icon}
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
    />
  )
}
