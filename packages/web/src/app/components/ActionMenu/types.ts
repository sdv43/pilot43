import type { MenuItem } from "../Menu"

export interface ActionMenuProps {
  "aria-label": string
  items: MenuItem[]
  onSelect: (itemId: string) => void
}
