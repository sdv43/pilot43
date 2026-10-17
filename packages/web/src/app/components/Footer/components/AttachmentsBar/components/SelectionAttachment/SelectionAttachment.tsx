import { useEffect } from "react"

import { usePageContentSelectionGet } from "../../../../../../../queries/pageContent"
import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { footerActions } from "../../../../store"
import { type SelectionAttachmentProps } from "./types"

export function SelectionAttachment({ attachment }: SelectionAttachmentProps) {
  const hasResolvedSnapshot =
    attachment.attachment.type === "page-content-selection" &&
    "content" in attachment.attachment &&
    "uniqueKey" in attachment.attachment
  const { data, isLoading, error } = usePageContentSelectionGet({
    enabled: !hasResolvedSnapshot,
    throwOnError: false,
  })

  useEffect(() => {
    if (hasResolvedSnapshot) return

    footerActions.updateAttachment(attachment.key, (currentAttachment) => ({
      isLoading,
      isError: !!error,
      errorMessage: error instanceof Error ? error.message : undefined,
      label: data?.title ?? currentAttachment.label,
      attachment: data
        ? {
            ...data,
            type: "page-content-selection",
          }
        : { type: "page-content-selection" },
    }))
  }, [attachment.key, data, error, hasResolvedSnapshot, isLoading])

  const label = isLoading ? "Loading…" : (attachment.label ?? "Selection")

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
