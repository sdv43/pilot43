import { useId, useState } from "react"

import { Badge, Popover } from "@/sidepanel/app/components"
import { cn } from "@/sidepanel/shared/cn"

import s from "./AttachmentBadge.module.css"
import { type AttachmentBadgeProps } from "./types"
import { getAttachmentPreview, getAttachmentPreviewTitle } from "./utils"

export function AttachmentBadge({
  attachment,
  "data-testid": dataTestId = "attachment-badge",
  isLoading,
  isError,
  errorMessage,
  className,
  popoverClassName,
  icon,
  label,
  style,
}: AttachmentBadgeProps) {
  const baseId = useId()
  const anchorName = `--attachment-preview-anchor-${baseId.replace(/:/g, "")}`
  const popoverId = `${baseId}-preview`
  const previewTitle = getAttachmentPreviewTitle(attachment, label)
  const preview = getAttachmentPreview(
    attachment,
    label,
    isLoading,
    isError,
    errorMessage,
  )
  const [isOpen, setIsOpen] = useState(false)

  if (!preview) {
    return (
      <Badge
        as="div"
        className={className}
        data-testid={dataTestId}
        icon={icon}
        style={style}
        variant={isError ? "error" : "default"}
      >
        {label}
      </Badge>
    )
  }

  return (
    <>
      <Badge
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        as="button"
        className={className}
        data-testid={dataTestId}
        icon={icon}
        popoverTarget={popoverId}
        style={{ anchorName, ...style }}
        type="button"
        variant={isError ? "error" : "default"}
      >
        {label}
      </Badge>

      <Popover
        anchorName={anchorName}
        aria-label={`${previewTitle} attachment preview`}
        className={cn(s.popover, popoverClassName)}
        data-testid="attachment-preview"
        id={popoverId}
        popover="auto"
        role="dialog"
        onOpenChange={setIsOpen}
      >
        <div className={s.title}>{previewTitle}</div>

        {preview.meta ? <div className={s.meta}>{preview.meta}</div> : null}

        {preview.kind === "image" ? (
          <img
            alt={preview.title}
            className={s.image}
            data-testid="attachment-preview-image"
            src={preview.src}
          />
        ) : (
          <div className={s.content} data-state={isError ? "error" : undefined}>
            {preview.content}
          </div>
        )}
      </Popover>
    </>
  )
}
