import type { ReactNode } from "react"

export interface AttachmentsBarProps {
  className?: string
  /** Shown after the chips, e.g. the current-tab suggestion. */
  trailing?: ReactNode
}
