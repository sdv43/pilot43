import type { ComponentPropsWithRef, ReactNode } from "react"

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type"
> {
  /** Optional text shown next to the box; clicking it toggles the box. */
  label?: ReactNode
}
