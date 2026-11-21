import { useRef } from "react"

import { useModelProviderGet } from "../../../queries/modelProvider"
import { cn } from "../../../shared/cn"
import {
  AttachmentsBar,
  AttachSuggestion,
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
  const { data: providers } = useModelProviderGet({ throwOnError: false })
  // First run: nothing can be sent until a provider is connected.
  const hasNoProvider = !!providers && providers.length === 0

  useChatModelSelection()

  return (
    <footer {...props} className={cn(s.footer, className)}>
      <TodoList className={s.todoList} />
      <div className={s.composer} data-mode={mode}>
        <AttachmentsBar
          trailing={
            mode === "idle" ? (
              <AttachSuggestion textareaRef={textareaRef} />
            ) : null
          }
        />
        <MessageEditor
          placeholder={
            hasNoProvider
              ? "Connect a model to start chatting"
              : composerPlaceholders[mode]
          }
          textareaRef={textareaRef}
        />
        <BottomBar textareaRef={textareaRef} />
      </div>
      <div className={s.hint}>
        <span className={s.hintText}>
          {hasNoProvider ? "No model connected yet" : composerHints[mode]}
        </span>
        <TokenEstimation />
      </div>
    </footer>
  )
}
