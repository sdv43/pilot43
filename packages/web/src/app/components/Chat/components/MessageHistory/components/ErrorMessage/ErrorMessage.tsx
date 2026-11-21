import { PlayIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "../../../../../Button"
import { ChatNotice } from "../../../../../ChatNotice"
import { type ErrorMessageProps } from "./types"

/** A run that failed, with Retry (and Continue when it can be resumed). */
export function ErrorMessage({
  error,
  isRetrying = false,
  onResume,
  onRetry,
}: ErrorMessageProps) {
  return (
    <ChatNotice
      actions={
        onRetry || onResume ? (
          <>
            {onResume ? (
              <Button
                data-testid="error-message-resume"
                disabled={isRetrying}
                icon={<PlayIcon />}
                size="small"
                variant="secondary"
                onClick={onResume}
              >
                Continue
              </Button>
            ) : null}
            {onRetry ? (
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
            ) : null}
          </>
        ) : undefined
      }
      data-testid="error-message"
      icon={<TriangleAlertIcon />}
      message={error}
      tone="danger"
    />
  )
}
