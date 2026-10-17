import { useRef } from "react"

import { cn } from "../../../shared/cn"
import {
  AttachmentsBar,
  BottomBar,
  MessageEditor,
  TodoList,
} from "./components"
import { TokenEstimation } from "./components/BottomBar/components/TokenEstimation"
import { composerHints, composerPlaceholders } from "./const"
import s from "./Footer.module.css"
import { useChatModelSelection } from "./hooks/useChatModelSelection"
import { useComposerMode } from "./hooks/useComposerMode"
import { type FooterProps } from "./types"

export function Footer({ className, ...props }: FooterProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { mode } = useComposerMode()

  useChatModelSelection()

  return (
    <footer {...props} className={cn(s.footer, className)}>
      <TodoList className={s.todoList} />
      <div className={s.composer} data-mode={mode}>
        <AttachmentsBar />
        <MessageEditor
          placeholder={composerPlaceholders[mode]}
          textareaRef={textareaRef}
        />
        <BottomBar textareaRef={textareaRef} />
      </div>
      <div className={s.hint}>
        <span className={s.hintText}>{composerHints[mode]}</span>
        <TokenEstimation />
      </div>
    </footer>
  )
}
