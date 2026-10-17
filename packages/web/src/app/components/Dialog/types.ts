import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface DialogProps extends Omit<
  ComponentPropsWithRef<"dialog">,
  "open" | "title"
> {
  defaultOpen?: boolean
  footer?: ReactNode
  onOpenChange?: (open: boolean) => void
  open?: boolean
  /** Shows the × button in the header. Defaults to `true`. */
  showCloseButton?: boolean
  title?: ReactNode
}
