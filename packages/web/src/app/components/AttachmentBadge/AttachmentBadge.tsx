import { GlobeIcon, LoaderCircleIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "../../../shared/cn"
import { BrandLogo, getUrlBrand } from "../BrandLogo"
import s from "./AttachmentBadge.module.css"
import { AttachmentPreviewDialog } from "./components/AttachmentPreviewDialog"
import { attachmentKindIcons } from "./icons"
import { type AttachmentBadgeProps } from "./types"
import { getAttachmentKind, getAttachmentPreview } from "./utils"

/** Attachment chip; clicking it previews what is sent to the model. */
export function AttachmentBadge({
  attachment,
  className,
  "data-testid": dataTestId = "attachment-badge",
  errorMessage,
  icon,
  isError,
  isLoading,
  label,
  onRefresh,
  onRemove,
}: AttachmentBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const kind = getAttachmentKind(attachment)
  const KindIcon = attachmentKindIcons[kind]
  // Tabs show the site's logo when it is a well-known site.
  const tabBrand =
    kind === "tab" && "url" in attachment ? getUrlBrand(attachment.url) : null
  const preview = getAttachmentPreview(
    attachment,
    label,
    isLoading,
    isError,
    errorMessage,
  )

  return (
    <span
      className={cn(s.attachmentBadge, className)}
      data-error={!!isError}
      data-testid={dataTestId}
    >
      <button
        aria-haspopup={preview ? "dialog" : undefined}
        className={s.chip}
        disabled={!preview}
        title={isError ? errorMessage : label}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true" className={s.icon} data-kind={kind}>
          {isLoading ? (
            <LoaderCircleIcon className={s.spinner} />
          ) : (
            (icon ??
            (tabBrand ? (
              <BrandLogo brand={tabBrand} fallback={GlobeIcon} size={14} />
            ) : (
              <KindIcon />
            )))
          )}
        </span>
        <span className={s.label}>{label}</span>
      </button>
      {onRemove ? (
        <button
          aria-label={`Remove ${label}`}
          className={s.remove}
          data-testid="attachment-badge-remove"
          type="button"
          onClick={onRemove}
        >
          <XIcon />
        </button>
      ) : null}
      {preview ? (
        <AttachmentPreviewDialog
          kind={kind}
          open={isOpen}
          preview={preview}
          onClose={() => setIsOpen(false)}
          onRefresh={onRefresh}
          onRemove={
            onRemove
              ? () => {
                  setIsOpen(false)
                  onRemove()
                }
              : undefined
          }
        />
      ) : null}
    </span>
  )
}
