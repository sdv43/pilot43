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
  /** `action` needs the user (accent border); `warning` is a provider or system problem. */
  tone?: "action" | "danger" | "neutral" | "warning"
}
