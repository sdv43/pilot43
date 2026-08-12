import { XIcon } from "lucide-react"
import { useId, useRef } from "react"

import { cn } from "@/sidepanel/shared/cn"
import { mergeRef } from "@/sidepanel/shared/mergeRef"

import type { DialogProps } from "./types"

import { IconButton } from "../IconButton"
import s from "./Dialog.module.css"
import { useDialogState } from "./hooks/useDialogState"
import { handleDialogClick } from "./utils"

export function Dialog({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  defaultOpen = false,
  footer,
  onCancel,
  onClick,
  onClose,
  onOpenChange,
  open,
  ref,
  title,
  ...props
}: DialogProps) {
  const titleId = useId()
  const internalRef = useRef<HTMLDialogElement>(null)

  const { isSyncCloseRef, handleClose } = useDialogState(
    open,
    defaultOpen,
    onOpenChange,
    internalRef,
  )

  const labelledBy =
    title && !ariaLabel && !ariaLabelledBy ? titleId : ariaLabelledBy

  return (
    <dialog
      {...props}
      ref={mergeRef(internalRef, ref)}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      className={cn(s.dialog, className)}
      onCancel={onCancel}
      onClick={(event) => handleDialogClick(event, internalRef, onClick)}
      onClose={(event) => {
        const isSyncClose = isSyncCloseRef.current

        handleClose(isSyncClose)

        if (!isSyncClose) {
          event.stopPropagation()
        }

        onClose?.(event)
      }}
    >
      <div className={s.layout}>
        <header className={s.header}>
          {title ? (
            <h2 className={s.title} id={titleId}>
              {title}
            </h2>
          ) : (
            <div />
          )}

          <IconButton
            aria-label="Close dialog"
            className={s.close}
            data-slot="dialog-close-button"
            icon={<XIcon size={14} />}
            variant="secondary"
            onClick={() => internalRef.current?.close("dismiss")}
          />
        </header>

        <div className={s.content}>{children}</div>

        {footer ? <footer className={s.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  )
}
