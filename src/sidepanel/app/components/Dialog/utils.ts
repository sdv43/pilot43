import { type MouseEvent, type RefObject } from "react"

export function handleDialogClick(
  event: MouseEvent<HTMLDialogElement>,
  internalRef: RefObject<HTMLDialogElement | null>,
  onClick?: (event: MouseEvent<HTMLDialogElement>) => void,
) {
  onClick?.(event)

  if (event.defaultPrevented || event.target !== event.currentTarget) {
    return
  }

  internalRef.current?.close("dismiss")
}
