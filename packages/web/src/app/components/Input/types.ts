import { type ComponentPropsWithRef } from "react"

export interface InputProps extends ComponentPropsWithRef<"input"> {
  variant?: "primary" | "transparent"
}
