import { type ComponentPropsWithRef } from "react"

export interface NumberFieldProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type"
> {
  invalid?: boolean
  /** Unit shown after the value, e.g. `tokens`. */
  suffix?: string
}
