import type { RefObject } from "react"

import {
  type EditorCommandOption,
  type EditorCommandType,
  type EditorParsedCommand,
} from "../../types"

export interface AutocompleteProps {
  anchorName: string
  commands: EditorParsedCommand[]
  id: string
  isTextareaFocused: boolean
  options: EditorCommandOption[]
  selectionEnd: number
  selectionStart: number
  text: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onSelect: (
    option: EditorCommandOption,
    activeCommand: ActiveAutocompleteCommand,
  ) => void
}

export interface ActiveAutocompleteCommand {
  end: number
  kind: EditorCommandType
  query: string
  start: number
}
