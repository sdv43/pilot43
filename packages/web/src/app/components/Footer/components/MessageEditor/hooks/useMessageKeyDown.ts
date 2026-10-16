import { type KeyboardEvent, type RefObject, useCallback } from "react"

import { useSendMessage } from "../../../hooks/useSendMessage"
import { footerActions } from "../../../store"

export function useMessageKeyDown(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const { isSendDisabled, sendMessage } = useSendMessage()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z"
      const isRedoShortcut =
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey))

      if (isUndoShortcut || isRedoShortcut) {
        event.preventDefault()
        event.stopPropagation()

        const nextCaret = isRedoShortcut
          ? footerActions.redo()
          : footerActions.undo()

        // When there is nothing to undo or redo, the text is unchanged and the
        // caret moves to the end right away. Otherwise the editor places it
        // once the restored text is rendered.
        const textarea = textareaRef.current
        if (nextCaret === null && textarea) {
          textarea.focus()
          textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length,
          )
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        if (!isSendDisabled) {
          void sendMessage()
        }
      }
    },
    [isSendDisabled, sendMessage, textareaRef],
  )

  return { handleKeyDown }
}
