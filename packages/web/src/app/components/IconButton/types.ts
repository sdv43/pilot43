import { type ComponentPropsWithRef, type ReactNode } from "react"

export interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  icon: ReactNode
  variant?: "primary" | "secondary"
}
