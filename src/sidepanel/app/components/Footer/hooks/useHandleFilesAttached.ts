import { type RefObject } from "react"

import { toast } from "../../ToastProvider"
import { prepareValue } from "../components/MessageEditor/components/Editor/utils"
import { useCommands } from "../components/MessageEditor/hooks/useCommands"
import { useFileCommands } from "../components/MessageEditor/hooks/useFileCommands"
import {
  createFileCommandOptions,
  insertCommandOptionsAtSelection,
} from "../components/MessageEditor/utils"
import { footerActions, useFooterStore } from "../store"

export function useHandleFilesAttached(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const pageCommands = useCommands()
  const fileCommands = useFileCommands()
  const commands = [...pageCommands, ...fileCommands]

  const handleFilesAttached = async (files: readonly File[]) => {
    if (files.length === 0) {
      return
    }

    try {
      const nextFileCommands = await createFileCommandOptions(files, commands)

      if (nextFileCommands.length === 0) {
        return
      }

      const { editorValue: currentValue } = useFooterStore.getState()
      const selectionStart =
        textareaRef.current?.selectionStart ?? currentValue.text.length
      const selectionEnd = textareaRef.current?.selectionEnd ?? selectionStart
      const { nextSelection, nextText } = insertCommandOptionsAtSelection(
        currentValue.text,
        nextFileCommands,
        selectionStart,
        selectionEnd,
      )

      footerActions.setEditorValue(
        prepareValue(
          {
            text: nextText,
            commands: currentValue.commands,
          },
          [...commands, ...nextFileCommands],
        ),
      )

      requestAnimationFrame(() => {
        const textarea = textareaRef.current

        if (!textarea) {
          return
        }

        textarea.focus()
        textarea.setSelectionRange(nextSelection, nextSelection)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

      toast(`Error attaching files: ${message}`, "error")
    }
  }

  return {
    handleFilesAttached,
    commands,
  }
}
