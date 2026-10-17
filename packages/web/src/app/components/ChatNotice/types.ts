import type { ReactNode } from "react"

export interface ChatNoticeProps {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  "data-testid"?: string
  icon: ReactNode
  message: ReactNode
  /** Secondary line under the message. */
  detail?: ReactNode
  tone?: "danger" | "neutral" | "warning"
}
