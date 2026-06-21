import { GlobeIcon } from "lucide-react"
import { useEffect, useMemo } from "react"

import { AttachmentBadge, Loader } from "@/sidepanel/app/components"
import { usePageContentGetById } from "@/sidepanel/queries/pageContent"

import { footerActions } from "../../../../store"
import s from "./PageAttachment.module.css"
import { type PageAttachmentProps } from "./types"

export function PageAttachment({ attachment }: PageAttachmentProps) {
  const hasResolvedSnapshot =
    attachment.attachment.type === "page-content" &&
    ("content" in attachment.attachment ||
      "textContent" in attachment.attachment)

  const pageId = useMemo(() => {
    const id = attachment.key.split(":")[1]
    return id ? parseInt(id, 10) : NaN
  }, [attachment.key])

  const { data, isLoading, error } = usePageContentGetById(pageId, {
    enabled: !hasResolvedSnapshot,
    snapshotKey: attachment.key,
    throwOnError: false,
  })

  useEffect(() => {
    if (isNaN(pageId) || hasResolvedSnapshot) return

    footerActions.updateAttachment(attachment.key, (currentAttachment) => ({
      isLoading,
      isError: !!error,
      errorMessage: error instanceof Error ? error.message : undefined,
      label: data?.title ?? currentAttachment.label,
      attachment: data
        ? {
            ...data,
            type: "page-content",
          }
        : { type: "page-content" },
    }))
  }, [attachment.key, data, error, hasResolvedSnapshot, isLoading, pageId])

  const icon = isLoading ? <Loader size={14} /> : <GlobeIcon size={14} />
  const label = isLoading ? "loading..." : (attachment.label ?? "Page")

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      className={s.pageAttachment}
      errorMessage={attachment.errorMessage}
      icon={icon}
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
    />
  )
}
