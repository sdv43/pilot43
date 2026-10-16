import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  icon?: ReactNode
  variant?: "primary" | "secondary"
}
