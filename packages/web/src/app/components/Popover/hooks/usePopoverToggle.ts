import { type RefObject, useEffect } from "react"

export function usePopoverToggle(
  popoverRef: RefObject<HTMLDivElement | null>,
  onOpenChange: ((isOpen: boolean) => void) | undefined,
) {
  useEffect(() => {
    const popoverNode = popoverRef.current

    if (!popoverNode) {
      return
    }

    function handleToggle() {
      if (popoverNode) {
        onOpenChange?.(popoverNode.matches(":popover-open"))
      }
    }

    popoverNode.addEventListener("toggle", handleToggle)

    return () => {
      popoverNode.removeEventListener("toggle", handleToggle)
    }
  }, [onOpenChange, popoverRef])
}
