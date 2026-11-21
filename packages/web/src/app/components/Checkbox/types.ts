import type { ComponentPropsWithRef, ReactNode } from "react"

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type"
> {
  /** Shows a dash: some, but not all, of the items it stands for are on. */
  indeterminate?: boolean
  /** Optional text shown next to the box; clicking it toggles the box. */
  label?: ReactNode
}
