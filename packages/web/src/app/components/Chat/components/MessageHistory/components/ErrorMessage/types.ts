import type { ComponentPropsWithoutRef } from "react"

export interface ErrorMessageProps extends ComponentPropsWithoutRef<"div"> {
  error: string
  isRetrying?: boolean
  onRetry?: () => void
}
