import type { AttachmentKind } from "../../types"
import type { AttachmentPreview } from "../../utils"

export interface AttachmentPreviewDialogProps {
  kind: AttachmentKind
  onClose: () => void
  onRefresh?: () => void
  onRemove?: () => void
  open: boolean
  preview: AttachmentPreview
}
