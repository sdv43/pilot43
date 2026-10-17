import { EllipsisVerticalIcon } from "lucide-react"
import { useId, useRef, useState } from "react"

import { IconButton } from "../IconButton"
import { Menu } from "../Menu"
import s from "./ActionMenu.module.css"
import { type ActionMenuProps } from "./types"

/** ⋮ button that opens a menu of row actions. */
export function ActionMenu({
  "aria-label": ariaLabel,
  items,
  onSelect,
}: ActionMenuProps) {
  const id = useId()
  const anchorName = `--action-menu-${id.replace(/:/g, "")}`
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <IconButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        icon={<EllipsisVerticalIcon />}
        size="small"
        style={{ anchorName }}
        onClick={(event) => {
          event.stopPropagation()
          menuRef.current?.togglePopover()
        }}
      />
      <Menu
        ref={menuRef}
        anchorName={anchorName}
        className={s.actionMenu}
        items={items}
        onItemClick={onSelect}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
