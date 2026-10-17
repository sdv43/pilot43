import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  icon: ReactNode
  size?: "default" | "small"
  variant?: "accent" | "ghost" | "outline" | "subtle"
}
