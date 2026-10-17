import type { Ref } from "react"

export interface MenuItem {
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
