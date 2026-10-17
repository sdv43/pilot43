import type { ReactNode } from "react"

export interface FieldControlProps {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  id: string
}

export interface FieldProps {
  className?: string
  /** Error text; replaces the helper and marks the control invalid. */
  error?: ReactNode
  helper?: ReactNode
  label?: ReactNode
  /** Extra content placed at the end of the label row (e.g. a counter). */
  labelAction?: ReactNode
  children: (control: FieldControlProps) => ReactNode
}
