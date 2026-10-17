import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  icon?: ReactNode
  size?: "default" | "small"
  variant?: "danger" | "danger-ghost" | "ghost" | "primary" | "secondary"
}
