import { CopyIcon, PencilIcon, RotateCcwIcon } from "lucide-react"
import { useState } from "react"

import type { UserMessageProps } from "./types"

import { AttachmentBadge } from "../../../../../AttachmentBadge"
import { Button } from "../../../../../Button"
import { IconButton } from "../../../../../IconButton"
import { Markdown } from "../../../../../Markdown"
import { toast } from "../../../../../ToastProvider"
import s from "./UserMessage.module.css"
import { getAttachmentLabel } from "./utils"

export function UserMessage({
  hasLaterRuns = false,
  isRetrying,
  message,
  onEdit,
  onRetry,
}: UserMessageProps) {
  const [draft, setDraft] = useState<null | string>(null)
  const isEditing = draft !== null

  const submit = () => {
    const content = draft?.trim()

    if (content && onEdit) {
      onEdit(content)
      setDraft(null)
    }
  }

  return (
    <div className={s.userMessage} data-testid="user-message">
      {message.attachments.length > 0 ? (
        <div className={s.attachments} data-testid="user-message-attachments">
          {message.attachments.map((attachment, index) => (
            <AttachmentBadge
              // eslint-disable-next-line @eslint-react/no-array-index-key -- sent attachments never change
              key={`${attachment.type}-${index}`}
              attachment={attachment}
              data-testid="user-message-attachment"
              label={getAttachmentLabel(attachment)}
            />
          ))}
        </div>
      ) : null}

      {isEditing ? (
        <div className={s.editor} data-testid="user-message-editor">
          <textarea
            autoFocus
            aria-label="Edit message"
            className={s.editorInput}
            rows={Math.min(8, Math.max(2, draft.split("\n").length))}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                setDraft(null)
              } else if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                submit()
              }
            }}
          />
          <div className={s.editorActions}>
            <span className={s.editorNote}>
              Sending reruns from here and replaces the{" "}
              {hasLaterRuns ? "replies" : "reply"} below.
            </span>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button
              data-testid="user-message-edit-send"
              disabled={!draft.trim() || isRetrying}
              size="small"
              onClick={submit}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
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
      )}

      {isEditing ? null : (
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
          {onEdit ? (
            <IconButton
              aria-label="Edit message"
              data-testid="user-message-edit"
              disabled={isRetrying}
              icon={<PencilIcon />}
              size="small"
              title="Edit"
              onClick={() => setDraft(message.content)}
            />
          ) : null}
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
      )}
    </div>
  )
}
