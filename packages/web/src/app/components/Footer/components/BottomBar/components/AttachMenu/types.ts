import type { RefObject } from "react"

export interface AttachMenuProps {
  onUploadFiles: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}
