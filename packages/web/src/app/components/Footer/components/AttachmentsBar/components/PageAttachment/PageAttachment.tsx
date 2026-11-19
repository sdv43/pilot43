import { GlobeIcon } from "lucide-react"
import { useEffect, useMemo } from "react"

import {
  usePageContentGet,
  usePageContentGetById,
} from "../../../../../../../queries/pageContent"
import { useApiClient } from "../../../../../ApiClientProvider/context"
import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { BrandLogo, getUrlBrand } from "../../../../../BrandLogo"
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
  // The open tab's favicon, while the tab is still open.
  const { data: openTabs } = usePageContentGet()
  const tab = openTabs?.find((item) => item.id === pageId)

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      errorMessage={attachment.errorMessage}
      icon={
        tab?.favIconUrl ? (
          <BrandLogo
            brand={getUrlBrand(tab.url)}
            fallback={GlobeIcon}
            size={14}
            src={tab.favIconUrl}
          />
        ) : undefined
      }
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
      onRefresh={() => {
        apiClient
          .pageContentGetById?.(pageId)
          .then((page) => {
            // The tab was closed or no longer runs the content script.
            if (!page) {
              toast(
                "Failed to refresh the page: it is no longer available",
                "error",
              )
              return
            }

            footerActions.updateAttachment(attachment.key, () => ({
              attachment: { ...page, type: "page-content" },
              label: page.title ?? attachment.label,
            }))
          })
          .catch((refreshError: unknown) => {
            toast(
              `Failed to refresh the page: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`,
              "error",
            )
          })
      }}
      onRemove={() => footerActions.removeAttachment(attachment.key)}
    />
  )
}
