import type { MessageUser } from "@pilot43/protocol"
import type { ReactNode } from "react"

export type AttachmentKind = "document" | "file" | "image" | "selection" | "tab"

export interface AttachmentBadgeProps {
  attachment: Partial<MessageUser["attachments"][number]>
  className?: string
  "data-testid"?: string
  errorMessage?: string
  icon?: ReactNode
  isError?: boolean
  isLoading?: boolean
  label: string
  /** Shows × on the chip and Remove in the preview. */
  onRemove?: () => void
  /** Shows Refresh in the preview (re-reads a page). */
  onRefresh?: () => void
}
