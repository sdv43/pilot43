import type { ComponentPropsWithoutRef } from "react"

export interface ContinuationPromptProps extends ComponentPropsWithoutRef<"div"> {
  messageRunId: string
  /** Whether the user has already responded to the prompt. */
  answered?: boolean
}
