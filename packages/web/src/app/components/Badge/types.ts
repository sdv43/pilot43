import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

export interface BadgeProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> {
  children?: ReactNode
  icon?: ReactNode
  variant?: "default" | "error" | "outline"
  as?: ElementType
}
