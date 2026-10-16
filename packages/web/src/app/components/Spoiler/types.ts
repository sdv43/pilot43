import type { ComponentPropsWithRef, ReactNode } from "react"

export interface SpoilerProps extends ComponentPropsWithRef<"details"> {
  maxHeight?: number
  isExpanded?: boolean
  defaultIsExpanded?: boolean
  onExpandedChange?: (isExpanded: boolean) => void
  labelOpen: ReactNode
  labelClose?: ReactNode
}
