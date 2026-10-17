import { type ComponentPropsWithRef } from "react"

export interface InputProps extends ComponentPropsWithRef<"input"> {
  /**
   * `primary` is the bordered form field, `search` the muted field at the top
   * of menus and `transparent` an unstyled input embedded in another control.
   */
  variant?: "primary" | "search" | "transparent"
  invalid?: boolean
}
