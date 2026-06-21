import { type ClipboardEvent } from "react"

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
  const { handleKeyDown } = useMessageKeyDown()

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
