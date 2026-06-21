export interface MenuItem {
  id: string
  label: string
}

export interface MenuProps {
  ref?: React.Ref<HTMLDivElement>
  anchorName: string
  className?: string
  id?: string
  items: MenuItem[]
  onItemClick: (itemId: string) => void
  onOpenChange?: (open: boolean) => void
}
