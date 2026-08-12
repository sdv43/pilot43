export function getMenuItems(popoverRef: HTMLDivElement | null) {
  if (!popoverRef) {
    return []
  }

  return Array.from(
    popoverRef.querySelectorAll<HTMLButtonElement>(
      "button[data-menu-item='true']:not(:disabled)",
    ),
  )
}

export function focusBoundaryItem(
  popoverRef: HTMLDivElement | null,
  target: "first" | "last",
) {
  const menuItems = getMenuItems(popoverRef)

  if (menuItems.length === 0) {
    return
  }

  if (target === "first") {
    menuItems[0]?.focus()
    return
  }

  menuItems.at(-1)?.focus()
}

export function moveFocus(
  popoverRef: HTMLDivElement | null,
  currentTarget: HTMLButtonElement,
  direction: -1 | 1,
) {
  const menuItems = getMenuItems(popoverRef)
  const currentIndex = menuItems.indexOf(currentTarget)

  if (currentIndex === -1 || menuItems.length === 0) {
    return
  }

  const nextIndex =
    (currentIndex + direction + menuItems.length) % menuItems.length
  menuItems[nextIndex]?.focus()
}

export function hidePopover(popoverRef: HTMLDivElement | null) {
  popoverRef?.hidePopover()
}

export function closeOtherMenus(currentPopoverRef: HTMLDivElement | null) {
  if (!currentPopoverRef) {
    return
  }

  const openMenus = document.querySelectorAll<HTMLElement>(
    "[popover][role='menu']:popover-open",
  )

  openMenus.forEach((popover) => {
    if (popover !== currentPopoverRef) {
      popover.hidePopover()
    }
  })
}
