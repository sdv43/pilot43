import type { FormEvent, ReactNode } from "react"

export interface SettingsSubpageProps {
  backTo: string
  children: ReactNode
  footer?: ReactNode
  /** Wraps content and footer in a form submitted by the footer buttons. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  title: ReactNode
}
