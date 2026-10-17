import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "../../../../../Button"
import { ChatNotice } from "../../../../../ChatNotice"
import { type ErrorMessageProps } from "./types"

/** A run that failed, with Retry. */
export function ErrorMessage({
  error,
  isRetrying = false,
  onRetry,
}: ErrorMessageProps) {
  return (
    <ChatNotice
      actions={
        onRetry ? (
          <Button
            data-testid="error-message-retry"
            disabled={isRetrying}
            icon={<RotateCcwIcon />}
            size="small"
            variant="secondary"
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : undefined
      }
      data-testid="error-message"
      icon={<TriangleAlertIcon />}
      message={error}
      tone="danger"
    />
  )
}
