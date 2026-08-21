import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react"

import type { MenuProps } from "./types"

import { mergeRef } from "../../../shared/mergeRef"
import { Popover } from "../Popover"
import s from "./Menu.module.css"
import {
  closeOtherMenus,
  focusBoundaryItem,
  hidePopover,
  moveFocus,
} from "./utils"

export function Menu({
  anchorName,
  className,
  id,
  items,
  onItemClick,
  onOpenChange,
  ref,
}: MenuProps) {
  const generatedId = useId()
  const menuId = id ?? generatedId
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const popoverNode = popoverRef.current

    if (!popoverNode) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hidePopover(popoverRef.current)
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (popoverNode && !popoverNode.contains(event.target as Node)) {
        hidePopover(popoverRef.current)
      }
    }

    popoverNode.addEventListener("keydown", handleKeyDown)

    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside)
    }, 0)

    return () => {
      popoverNode.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timeoutId)
      document.removeEventListener("click", handleClickOutside)
    }
  }, [])

  function handlePopoverOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen)

    if (nextOpen) {
      closeOtherMenus(popoverRef.current)
      focusBoundaryItem(popoverRef.current, "first")
    }
  }

  function handleItemKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        moveFocus(popoverRef.current, event.currentTarget, 1)
        break
      }
      case "ArrowUp": {
        event.preventDefault()
        moveFocus(popoverRef.current, event.currentTarget, -1)
        break
      }
      case "End": {
        event.preventDefault()
        focusBoundaryItem(popoverRef.current, "last")
        break
      }
      case "Home": {
        event.preventDefault()
        focusBoundaryItem(popoverRef.current, "first")
        break
      }
      default:
        break
    }
  }

  const handleItemClick = useCallback(
    (itemId: string) => {
      hidePopover(popoverRef.current)
      onItemClick(itemId)
    },
    [onItemClick],
  )

  return (
    <Popover
      ref={mergeRef(popoverRef, ref)}
      anchorName={anchorName}
      className={className}
      id={menuId}
      popover="manual"
      role="menu"
      onOpenChange={handlePopoverOpenChange}
    >
      {items.map((item) => (
        <button
          key={item.id}
          className={s.menuItem}
          data-menu-item="true"
          role="menuitem"
          type="button"
          onClick={() => handleItemClick(item.id)}
          onKeyDown={handleItemKeyDown}
        >
          {item.label}
        </button>
      ))}
    </Popover>
  )
}
