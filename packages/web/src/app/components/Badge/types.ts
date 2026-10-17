import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"

export type BadgeTone =
  "accent" | "danger" | "info" | "neutral" | "success" | "warning"

export interface BadgeProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> {
  children?: ReactNode
  /** Shows a small status dot before the label. */
  dot?: boolean
  icon?: ReactNode
  tone?: BadgeTone
  as?: ElementType
}
