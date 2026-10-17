import type { Ref } from "react"

export interface MenuItem {
  /** Set on every item to make the menu a single-choice list. */
  checked?: boolean
  /** Secondary text shown after the label. */
  description?: string
  id: string
  label: string
  /** `danger` colours destructive actions. */
  tone?: "danger" | "default"
}

export interface MenuProps {
  ref?: Ref<HTMLDivElement>
  anchorName: string
  className?: string
  id?: string
  items: MenuItem[]
  onItemClick: (itemId: string) => void
  onOpenChange?: (open: boolean) => void
}
