import { useEffect, useRef, useState } from "react"

export function useDialogState(
  open: boolean | undefined,
  defaultOpen: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
  dialogRef: React.RefObject<HTMLDialogElement | null>,
) {
  const isSyncCloseRef = useRef(false)
  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }

      return
    }

    if (!dialog.open) {
      return
    }

    isSyncCloseRef.current = true
    dialog.close()
  }, [isOpen, dialogRef])

  function handleClose(isSyncClose: boolean) {
    isSyncCloseRef.current = false

    if (!isControlled) {
      setInternalOpen(false)
    }

    if (!isSyncClose) {
      onOpenChange?.(false)
    }
  }

  return {
    isControlled,
    isOpen,
    isSyncCloseRef,
    handleClose,
  }
}
