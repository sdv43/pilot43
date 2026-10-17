import { useState } from "react"

import { cn } from "../../../../../shared/cn"
import { Badge } from "../../../Badge"
import { useFooterStore } from "../../store"
import { isPageCommand, isSelectionCommand } from "../../utils"
import s from "./AttachmentsBar.module.css"
import {
  FileAttachment,
  PageAttachment,
  SelectionAttachment,
} from "./components"
import { collapsedAttachmentCount } from "./const"
import { type AttachmentsBarProps } from "./types"

/** Attachment chips above the message; extras collapse into "+N". */
export function AttachmentsBar({ className }: AttachmentsBarProps) {
  const attachments = useFooterStore((state) => state.attachments)
  const [isExpanded, setIsExpanded] = useState(false)

  if (attachments.length === 0) {
    return null
  }

  const hidden = isExpanded ? 0 : attachments.length - collapsedAttachmentCount
  const visible =
    hidden > 0 ? attachments.slice(0, collapsedAttachmentCount) : attachments

  return (
    <div
      className={cn(s.attachmentsBar, className)}
      data-testid="attachments-bar"
    >
      {visible.map((attachment) => {
        const command = attachment.command?.command ?? ""

        if (isSelectionCommand(command)) {
          return (
            <SelectionAttachment key={attachment.key} attachment={attachment} />
          )
        }

        if (isPageCommand(command)) {
          return <PageAttachment key={attachment.key} attachment={attachment} />
        }

        if (attachment.attachment?.type === "file") {
          return <FileAttachment key={attachment.key} attachment={attachment} />
        }

        return (
          <Badge key={attachment.key} tone="danger">
            Unknown
          </Badge>
        )
      })}
      {hidden > 0 ? (
        <button
          aria-label={`Show ${hidden} more attachments`}
          className={s.more}
          type="button"
          onClick={() => setIsExpanded(true)}
        >
          +{hidden}
        </button>
      ) : null}
    </div>
  )
}
