import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  icon?: ReactNode
  /** Replaces the icon with a spinner and disables the button. */
  loading?: boolean
  size?: "default" | "small"
  variant?: "danger" | "danger-ghost" | "ghost" | "primary" | "secondary"
}
