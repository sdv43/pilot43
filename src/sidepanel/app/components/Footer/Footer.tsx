import { useRef } from "react"

import { cn } from "../../../shared/cn"
import {
  AttachmentsBar,
  BottomBar,
  MessageEditor,
  TodoList,
} from "./components"
import s from "./Footer.module.css"
import { type FooterProps } from "./types"

export function Footer({ className, ...props }: FooterProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  return (
    <footer {...props} className={cn(className)}>
      <TodoList />
      <div className={s.footer}>
        <AttachmentsBar />
        <MessageEditor textareaRef={textareaRef} />
        <BottomBar textareaRef={textareaRef} />
      </div>
    </footer>
  )
}
