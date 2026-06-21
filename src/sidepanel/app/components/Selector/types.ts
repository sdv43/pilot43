import { type ComponentPropsWithRef, type ReactNode } from "react"

export type SelectorEntry = SelectorOption | SelectorOptionGroup

export interface SelectorOption {
  disabled?: boolean
  label: ReactNode
  value: string
}

export interface SelectorOptionGroup {
  id: string
  label: ReactNode
  options: SelectorOption[]
  error?: ReactNode
}

export interface SelectorProps extends Omit<
  ComponentPropsWithRef<"button">,
  "children" | "defaultValue" | "onChange" | "value"
> {
  defaultValue?: string
  footer?: ReactNode
  header?: ReactNode
  noOptionsMessage?: ReactNode
  onValueChange?: (value: string, option: SelectorOption) => void
  options: SelectorEntry[]
  placeholder?: string
  value?: string
  variant?: "input" | "primary" | "secondary"
  popoverClassName?: string
}
