import { type ComponentPropsWithRef } from "react"

import { type EditorValue } from "../../types"

export interface HighlightedValueProps extends ComponentPropsWithRef<"div"> {
  placeholder?: string
  value: EditorValue
}
