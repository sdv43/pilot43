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

        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return

          const clampedCaret = Math.min(
            nextCaret ?? textarea.value.length,
            textarea.value.length,
          )
          textarea.focus()
          textarea.setSelectionRange(clampedCaret, clampedCaret)
        })
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
