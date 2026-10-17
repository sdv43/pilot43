import { Dialog } from "../Dialog"
import { ConfirmDialogContent } from "./components/ConfirmDialogContent"
import { type ConfirmDialogProps } from "./types"

/** Modal asking the user to confirm an action, usually a destructive one. */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  return (
    <Dialog
      aria-label={props.title}
      open={open}
      showCloseButton={false}
      onOpenChange={props.onOpenChange}
    >
      {open ? <ConfirmDialogContent {...props} /> : null}
    </Dialog>
  )
}
