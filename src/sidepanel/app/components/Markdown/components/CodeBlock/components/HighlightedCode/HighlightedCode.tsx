import type { HighlightedCodeProps } from "./types"

import { codeTheme, SyntaxHighlighter } from "../../utils"

export function HighlightedCode({
  code,
  customStyle,
  language,
  showLineNumbers = false,
}: HighlightedCodeProps) {
  return (
    <SyntaxHighlighter
      customStyle={{
        borderRadius: "6px",
        fontSize: "12px",
        margin: 0,
        padding: "8px",
        ...customStyle,
      }}
      language={language}
      PreTag="div"
      showLineNumbers={showLineNumbers}
      style={codeTheme}
    >
      {code}
    </SyntaxHighlighter>
  )
}
