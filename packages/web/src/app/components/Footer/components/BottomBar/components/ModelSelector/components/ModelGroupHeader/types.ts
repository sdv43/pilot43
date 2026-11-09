import type { ReactNode } from "react"

export interface ModelGroupHeaderProps {
  /** Models shown in the group: all of them, or the matches while searching. */
  count: number
  error?: ReactNode
  /** Folding is off while searching and for groups without models. */
  isCollapsible: boolean
  isCollapsed: boolean
  name: string
  /** Current model, shown while the group that holds it is collapsed. */
  selectedModelName?: string
  onToggle: () => void
}
