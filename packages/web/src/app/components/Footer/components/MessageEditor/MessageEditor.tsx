import { type ClipboardEvent, useLayoutEffect } from "react"

import { cn } from "../../../../../shared/cn"
import { useHandleFilesAttached } from "../../hooks/useHandleFilesAttached"
import { footerActions, useFooterStore } from "../../store"
import { Editor } from "./components/Editor"
import { useMessageKeyDown } from "./hooks/useMessageKeyDown"
import s from "./MessageEditor.module.css"
import { type MessageEditorProps } from "./types"

export function MessageEditor({ className, textareaRef }: MessageEditorProps) {
  const value = useFooterStore((state) => state.editorValue)
  const { commands, handleFilesAttached } = useHandleFilesAttached(textareaRef)
  const { handleKeyDown } = useMessageKeyDown(textareaRef)

  // Place the caret requested by a programmatic edit (autocomplete, undo/redo,
  // file attach) right after the new value is committed, before the next
  // keystroke can be inserted at a stale position.
  useLayoutEffect(() => {
    const caret = footerActions.takePendingCaret()
    const textarea = textareaRef.current

    if (caret === null || !textarea) {
      return
    }

    const position = Math.min(caret, textarea.value.length)
    textarea.focus()
    textarea.setSelectionRange(position, position)
  }, [textareaRef, value])

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files)

    if (files.length === 0) {
      return
    }

    event.preventDefault()
    void handleFilesAttached(files)
  }

  return (
    <div className={cn(s.container, className)}>
      <Editor
        ref={textareaRef}
        commands={commands}
        value={value}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onValueChange={footerActions.setEditorValue}
      />
    </div>
  )
}
