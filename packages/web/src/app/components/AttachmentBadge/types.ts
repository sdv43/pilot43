import type { MessageUser } from "@pilot43/protocol"

import { type CSSProperties, type ReactNode } from "react"

export interface AttachmentBadgeProps {
  attachment: Partial<MessageUser["attachments"][number]>
  "data-testid"?: string
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  className?: string
  popoverClassName?: string
  icon?: ReactNode
  label: string
  style?: CSSProperties
}
