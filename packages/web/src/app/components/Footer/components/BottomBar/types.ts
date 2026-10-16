import { type ComponentPropsWithoutRef, type RefObject } from "react"

export interface BottomBarProps extends ComponentPropsWithoutRef<"div"> {
  textareaRef: RefObject<HTMLTextAreaElement | null>
}
