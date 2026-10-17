import { useEffect, useMemo } from "react"

import { usePageContentGetById } from "../../../../../../../queries/pageContent"
import { useApiClient } from "../../../../../ApiClientProvider/context"
import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { toast } from "../../../../../ToastProvider"
import { footerActions } from "../../../../store"
import { type PageAttachmentProps } from "./types"

export function PageAttachment({ attachment }: PageAttachmentProps) {
  const apiClient = useApiClient()
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

  const label = isLoading ? "Loading…" : (attachment.label ?? "Page")

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      errorMessage={attachment.errorMessage}
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
      onRefresh={() => {
        apiClient
          .pageContentGetById?.(pageId)
          .then((page) => {
            if (page) {
              footerActions.updateAttachment(attachment.key, () => ({
                attachment: { ...page, type: "page-content" },
                label: page.title ?? attachment.label,
              }))
            }
          })
          .catch((refreshError: unknown) => {
            toast(
              `Failed to refresh the page: ${String(refreshError)}`,
              "error",
            )
          })
      }}
      onRemove={() => footerActions.removeAttachment(attachment.key)}
    />
  )
}
