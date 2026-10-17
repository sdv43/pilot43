import type { ReactNode } from "react"

export interface SettingsRowProps {
  className?: string
  /** Control placed at the end of the row (toggle, select, buttons…). */
  control?: ReactNode
  description?: ReactNode
  /** Id of the control the title labels. */
  htmlFor?: string
  leading?: ReactNode
  /** Makes the whole row a button with a trailing chevron. */
  onClick?: () => void
  title: ReactNode
  /** `danger` colours the title for destructive actions. */
  tone?: "danger" | "default"
  "data-testid"?: string
}
