import { CopyIcon, RefreshCwIcon } from "lucide-react"

import { IconButton } from "../../../../../IconButton"
import { toast } from "../../../../../ToastProvider"
import s from "./MessageActions.module.css"
import { type MessageActionsProps } from "./types"

/** Copy and regenerate buttons with token and timing info under a reply. */
export function MessageActions({
  copyText,
  isRetrying = false,
  meta,
  onRetry,
}: MessageActionsProps) {
  return (
    <div className={s.messageActions} data-testid="assistant-message-meta">
      {copyText ? (
        <IconButton
          aria-label="Copy message"
          icon={<CopyIcon />}
          size="small"
          title="Copy"
          onClick={() => {
            navigator.clipboard.writeText(copyText).then(
              () => toast("Copied to clipboard"),
              (error: unknown) =>
                toast(`Failed to copy text: ${String(error)}`),
            )
          }}
        />
      ) : null}
      {onRetry ? (
        <IconButton
          aria-label="Regenerate response"
          disabled={isRetrying}
          icon={<RefreshCwIcon />}
          size="small"
          title="Regenerate"
          onClick={onRetry}
        />
      ) : null}
      {meta ? (
        <span className={s.meta} data-testid="assistant-message-tokens">
          {meta}
        </span>
      ) : null}
    </div>
  )
}
