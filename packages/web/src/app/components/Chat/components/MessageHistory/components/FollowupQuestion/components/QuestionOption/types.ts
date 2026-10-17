import type { ReactNode } from "react"

export interface QuestionOptionProps {
  checked: boolean
  children?: ReactNode
  description?: string
  label: string
  name: string
  onChange: () => void
  recommended?: boolean
  type: "checkbox" | "radio"
}
