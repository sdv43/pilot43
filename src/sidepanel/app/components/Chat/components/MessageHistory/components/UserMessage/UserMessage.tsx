import type { ReactNode } from "react"

import {
  CopyIcon,
  FileTextIcon,
  PaperclipIcon,
  RotateCcwIcon,
  SquareDashedTextIcon,
} from "lucide-react"

import type { MessageUser } from "@/shared/api"

import {
  AttachmentBadge,
  IconButton,
  Markdown,
  toast,
} from "@/sidepanel/app/components"
import { cn } from "@/sidepanel/shared/cn"

import type { UserMessageProps } from "./types"

import s from "./UserMessage.module.css"

const attachmentIconMap: Record<
  MessageUser["attachments"][number]["type"],
  ReactNode
> = {
  "page-content-selection": <SquareDashedTextIcon />,
  "page-content": <FileTextIcon />,
  file: <PaperclipIcon />,
}

export function UserMessage({
  message,
  className,
  isRetrying,
  onRetry,
  ...props
}: UserMessageProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast("Copied to clipboard")
    } catch (err) {
      toast(`Failed to copy text: ${String(err)}`)
    }
  }

  return (
    <div
      {...props}
      className={cn(s.userMessageWrapper, className)}
      data-testid="user-message"
    >
      <div className={s.userMessage}>
        <Markdown
          commandReferences={[
            ...(message.commandReference ? [message.commandReference] : []),
            ...(message.attachmentReferences ?? []),
          ]}
        >
          {message.content}
        </Markdown>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <div className={s.attachments} data-testid="user-message-attachments">
          {message.attachments.map((attachment) => (
            <AttachmentBadge
              key={`${attachment.type}-${attachment.type === "file" ? attachment.name : attachment.title}`}
              attachment={attachment}
              className={s.attachment}
              data-testid="user-message-attachment"
              icon={attachmentIconMap[attachment.type]}
              label={
                (attachment.type === "file"
                  ? attachment.name
                  : attachment.title) ?? "Attachment"
              }
              popoverClassName={s.attachmentPopover}
            />
          ))}
        </div>
      )}

      <div className={s.meta} data-testid="user-message-meta">
        {message.tokenCount !== undefined && (
          <span className={s.metaItem} data-testid="user-message-tokens">
            {message.tokenCount.toLocaleString()} tok
          </span>
        )}

        <IconButton
          aria-label="Copy message"
          className={s.metaButton}
          icon={<CopyIcon size={12} />}
          variant="secondary"
          onClick={() => void handleCopy()}
        />

        {onRetry && (
          <IconButton
            aria-label="Regenerate response"
            className={s.metaButton}
            disabled={isRetrying}
            icon={<RotateCcwIcon size={12} />}
            variant="secondary"
            onClick={onRetry}
          />
        )}
      </div>
    </div>
  )
}
