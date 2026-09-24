import type { CSSProperties } from "react"

import type { CodeBlockProps } from "../../types"

export interface HighlightedCodeProps extends CodeBlockProps {
  customStyle?: CSSProperties
  showLineNumbers?: boolean
}
