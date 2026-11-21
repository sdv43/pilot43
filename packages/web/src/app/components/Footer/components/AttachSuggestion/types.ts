import type { RefObject } from "react"

import type { EditorCommandOption } from "../MessageEditor/components/Editor/types"

export interface AttachSuggestionProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export interface AttachSuggestionOption {
  kind: "selection" | "tab"
  option: EditorCommandOption
}
