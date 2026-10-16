import { type RefObject } from "react"

export interface MessageEditorProps {
  className?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
}
