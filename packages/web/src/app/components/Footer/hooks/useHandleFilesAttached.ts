import { type RefObject } from "react"

import type { EditorCommandOption } from "../components/MessageEditor/components/Editor/types"

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

  /** Inserts `#` tokens for the options at the caret. */
  const insertOptions = (nextOptions: EditorCommandOption[]) => {
    if (nextOptions.length === 0) {
      return
    }

    const { editorValue: currentValue } = useFooterStore.getState()
    const textLength = currentValue.text.length
    const rawSelectionStart = textareaRef.current?.selectionStart ?? textLength
    const rawSelectionEnd =
      textareaRef.current?.selectionEnd ?? rawSelectionStart
    const selectionStart = Math.min(rawSelectionStart, textLength)
    const selectionEnd = Math.min(
      Math.max(rawSelectionEnd, selectionStart),
      textLength,
    )
    const { nextSelection, nextText } = insertCommandOptionsAtSelection(
      currentValue.text,
      nextOptions,
      selectionStart,
      selectionEnd,
    )

    footerActions.setEditorValue(
      prepareValue(
        {
          text: nextText,
          commands: currentValue.commands,
        },
        [...commands, ...nextOptions],
      ),
      nextSelection,
    )
  }

  const handleFilesAttached = async (files: readonly File[]) => {
    if (files.length === 0) {
      return
    }

    try {
      insertOptions(await createFileCommandOptions(files, commands))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

      toast(`Error attaching files: ${message}`, "error")
    }
  }

  return {
    commands,
    handleFilesAttached,
    insertOptions,
  }
}
