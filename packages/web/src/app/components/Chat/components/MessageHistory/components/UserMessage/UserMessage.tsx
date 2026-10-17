import { CopyIcon, RotateCcwIcon } from "lucide-react"

import type { UserMessageProps } from "./types"

import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { IconButton } from "../../../../../IconButton"
import { Markdown } from "../../../../../Markdown"
import { toast } from "../../../../../ToastProvider"
import s from "./UserMessage.module.css"
import { getAttachmentLabel } from "./utils"

export function UserMessage({
  isRetrying,
  message,
  onRetry,
}: UserMessageProps) {
  return (
    <div className={s.userMessage} data-testid="user-message">
      {message.attachments.length > 0 ? (
        <div className={s.attachments} data-testid="user-message-attachments">
          {message.attachments.map((attachment, index) => (
            <AttachmentBadge
              key={`${attachment.type}-${index}`}
              attachment={attachment}
              data-testid="user-message-attachment"
              label={getAttachmentLabel(attachment)}
            />
          ))}
        </div>
      ) : null}

      <div className={s.bubble}>
        <Markdown
          commandReferences={[
            ...(message.commandReference ? [message.commandReference] : []),
            ...(message.attachmentReferences ?? []),
          ]}
        >
          {message.content}
        </Markdown>
      </div>

      <div className={s.meta} data-testid="user-message-meta">
        {message.tokenCount !== undefined ? (
          <span
            className={s.tokens}
            data-testid="user-message-tokens"
            title="Prompt sent with this message: the chat history, system prompt and tool definitions included"
          >
            {message.tokenCount.toLocaleString("en-US")} tokens sent
          </span>
        ) : null}
        <IconButton
          aria-label="Copy message"
          icon={<CopyIcon />}
          size="small"
          title="Copy"
          onClick={() => {
            navigator.clipboard.writeText(message.content).then(
              () => toast("Copied to clipboard"),
              (error: unknown) =>
                toast(`Failed to copy text: ${String(error)}`),
            )
          }}
        />
        {onRetry ? (
          <IconButton
            aria-label="Regenerate response"
            disabled={isRetrying}
            icon={<RotateCcwIcon />}
            size="small"
            title="Regenerate"
            onClick={onRetry}
          />
        ) : null}
      </div>
    </div>
  )
}
