import { cn } from "@/sidepanel/shared/cn"

import type { ErrorMessageProps } from "./types"

import s from "./ErrorMessage.module.css"

export function ErrorMessage({
  error,
  className,
  isRetrying = false,
  onRetry,
  ...props
}: ErrorMessageProps) {
  return (
    <div
      {...props}
      className={cn(s.errorMessage, className)}
      data-testid="error-message"
    >
      <span>{error}</span>

      {onRetry ? (
        <button
          className={s.retryButton}
          disabled={isRetrying}
          type="button"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
