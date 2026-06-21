import { Badge } from "@/sidepanel/app/components/Badge"
import { cn } from "@/sidepanel/shared/cn"

import { useFooterStore } from "../../store"
import { isPageCommand, isSelectionCommand } from "../../utils"
import s from "./AttachmentsBar.module.css"
import {
  FileAttachment,
  PageAttachment,
  SelectionAttachment,
} from "./components"
import { type AttachmentsBarProps } from "./types"

export function AttachmentsBar({ className, ...props }: AttachmentsBarProps) {
  const attachments = useFooterStore((state) => state.attachments)

  if (attachments.length === 0) {
    return null
  }

  return (
    <div {...props} className={cn(s.container, className)}>
      {attachments.map((attachment) => {
        const key = attachment.key

        if (isSelectionCommand(attachment.command?.command ?? "")) {
          return <SelectionAttachment key={key} attachment={attachment} />
        }

        if (isPageCommand(attachment.command?.command ?? "")) {
          return <PageAttachment key={key} attachment={attachment} />
        }

        if (attachment.attachment?.type === "file") {
          return <FileAttachment key={key} attachment={attachment} />
        }

        return <Badge key={key}>Unknown</Badge>
      })}
    </div>
  )
}
