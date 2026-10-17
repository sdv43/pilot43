import type { ReactNode } from "react"

export interface SegmentedControlOption<Value extends string> {
  icon?: ReactNode
  label: ReactNode
  value: Value
}

export interface SegmentedControlProps<Value extends string> {
  "aria-label"?: string
  className?: string
  /** Stretches the options to fill the available width. */
  fill?: boolean
  onChange: (value: Value) => void
  options: readonly SegmentedControlOption<Value>[]
  /** `compact` uses the smaller corner radius of inline controls. */
  size?: "compact" | "default"
  value: Value
}
