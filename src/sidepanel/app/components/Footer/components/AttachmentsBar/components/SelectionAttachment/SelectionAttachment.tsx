import { SquareDashedTextIcon } from "lucide-react"
import { useEffect } from "react"

import { AttachmentBadge, Loader } from "@/sidepanel/app/components"
import { usePageContentSelectionGet } from "@/sidepanel/queries/pageContent"

import { footerActions } from "../../../../store"
import s from "./SelectionAttachment.module.css"
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

  const icon = isLoading ? (
    <Loader size={14} />
  ) : (
    <SquareDashedTextIcon size={14} />
  )
  const label = isLoading ? "loading..." : (attachment.label ?? "Selection")

  return (
    <AttachmentBadge
      attachment={attachment.attachment}
      className={s.selectionAttachment}
      errorMessage={attachment.errorMessage}
      icon={icon}
      isError={attachment.isError}
      isLoading={attachment.isLoading}
      label={label}
    />
  )
}
