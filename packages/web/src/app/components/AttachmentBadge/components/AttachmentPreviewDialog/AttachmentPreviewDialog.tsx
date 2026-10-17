import { RefreshCwIcon, TrashIcon } from "lucide-react"

import { Button } from "../../../Button"
import { Dialog } from "../../../Dialog"
import { attachmentKindIcons } from "../../icons"
import { estimateTokens } from "../../utils"
import s from "./AttachmentPreviewDialog.module.css"
import { type AttachmentPreviewDialogProps } from "./types"

/** Shows the content of an attachment exactly as it is sent. */
export function AttachmentPreviewDialog({
  kind,
  onClose,
  onRefresh,
  onRemove,
  open,
  preview,
}: AttachmentPreviewDialogProps) {
  const KindIcon = attachmentKindIcons[kind]

  return (
    <Dialog
      aria-label={`${preview.title} attachment preview`}
      className={s.attachmentPreviewDialog}
      data-testid="attachment-preview"
      footer={
        <>
          <span className={s.meta}>
            {preview.kind === "image"
              ? "Image"
              : estimateTokens(preview.content)}
          </span>
          {onRemove ? (
            <Button
              icon={<TrashIcon />}
              size="small"
              variant={onRefresh ? "ghost" : "secondary"}
              onClick={onRemove}
            >
              Remove
            </Button>
          ) : null}
          {onRefresh ? (
            <Button
              icon={<RefreshCwIcon />}
              size="small"
              variant="secondary"
              onClick={onRefresh}
            >
              Refresh
            </Button>
          ) : null}
        </>
      }
      open={open}
      title={
        <span className={s.title}>
          <span aria-hidden="true" className={s.thumb} data-kind={kind}>
            <KindIcon />
          </span>
          <span className={s.titleText}>
            <span className={s.name}>{preview.title}</span>
            {preview.meta ? (
              <span className={s.url}>{preview.meta}</span>
            ) : null}
          </span>
        </span>
      }
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      {preview.kind === "image" ? (
        <div className={s.imageStage}>
          <img
            alt={preview.title}
            className={s.image}
            data-testid="attachment-preview-image"
            src={preview.src}
          />
        </div>
      ) : (
        <div className={s.text} data-testid="attachment-preview-content">
          {preview.content}
        </div>
      )}
    </Dialog>
  )
}
