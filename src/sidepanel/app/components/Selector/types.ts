import { type ComponentPropsWithRef, type ReactNode } from "react"

export type SelectorEntry = SelectorOption | SelectorOptionGroup

export interface SelectorOption {
  disabled?: boolean
  label: ReactNode
  value: string
  title?: string
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
  /**
   * When true, option groups render a toggle button in their header that lets
   * the user collapse/expand the group's options. Groups are expanded by
   * default and the collapse state is kept while the selector stays mounted.
   */
  collapsibleGroups?: boolean
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
