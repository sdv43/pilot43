import type { ComponentPropsWithRef, ReactNode } from "react"

export interface SelectOption {
  disabled?: boolean
  label: string
  value: string
}

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  icon?: ReactNode
  options?: readonly SelectOption[]
  /**
   * `chip` is the compact muted control used in settings rows; `field` is the
   * full-width bordered control used in forms.
   */
  variant?: "chip" | "field"
}
