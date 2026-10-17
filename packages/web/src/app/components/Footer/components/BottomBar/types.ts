import { type RefObject } from "react"

export interface BottomBarProps {
  className?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
}
