import { useMemo } from "react"

import type { FileAttachment } from "@/shared/api"

import type { EditorCommandOption } from "../components/Editor/types"

import { useFooterStore } from "../../../store"

function isFileAttachment(
  attachment: ReturnType<
    typeof useFooterStore.getState
  >["attachments"][number]["attachment"],
): attachment is FileAttachment {
  return (
    attachment.type === "file" &&
    typeof attachment.content === "string" &&
    typeof attachment.mediaType === "string" &&
    typeof attachment.name === "string" &&
    typeof attachment.size === "number"
  )
}

export function useFileCommands() {
  const attachments = useFooterStore((state) => state.attachments)

  return useMemo<EditorCommandOption[]>(() => {
    return attachments.flatMap((attachment) => {
      if (!isFileAttachment(attachment.attachment) || !attachment.command) {
        return []
      }

      return [
        {
          attachment: attachment.attachment,
          command: attachment.command.command,
          key: attachment.key,
          type: attachment.command.type,
        },
      ]
    })
  }, [attachments])
}
