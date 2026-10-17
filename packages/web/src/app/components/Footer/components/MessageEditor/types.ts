import { type RefObject } from "react"

export interface MessageEditorProps {
  className?: string
  placeholder?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
}
