import type { ComponentPropsWithRef, ReactNode } from "react"

export interface PopoverProps extends ComponentPropsWithRef<"div"> {
  anchorName?: string
  children: ReactNode
  onOpenChange?: (open: boolean) => void
}
