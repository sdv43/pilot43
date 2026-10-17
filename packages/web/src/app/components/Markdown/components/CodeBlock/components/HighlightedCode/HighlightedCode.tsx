import type { HighlightedCodeProps } from "./types"

import { useResolvedTheme } from "../../../../../../../shared/theme"
import { codeThemes, SyntaxHighlighter } from "../../utils"

export function HighlightedCode({
  code,
  customStyle,
  language,
  showLineNumbers = false,
}: HighlightedCodeProps) {
  const theme = useResolvedTheme()

  return (
    <SyntaxHighlighter
      codeTagProps={{
        style: { background: "transparent", fontFamily: "var(--font-mono)" },
      }}
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
      style={codeThemes[theme]}
    >
      {code}
    </SyntaxHighlighter>
  )
}
