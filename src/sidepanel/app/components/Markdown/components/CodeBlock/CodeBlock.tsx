import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json"
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx"
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import { oneDark as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism"

import type { CodeBlockProps } from "./types"

import s from "./CodeBlock.module.css"

SyntaxHighlighter.registerLanguage("bash", bash)
SyntaxHighlighter.registerLanguage("css", css)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("jsx", jsx)
SyntaxHighlighter.registerLanguage("markdown", markdown)
SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("sql", sql)
SyntaxHighlighter.registerLanguage("tsx", tsx)
SyntaxHighlighter.registerLanguage("typescript", typescript)

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={s.codeWrapper}>
      <button
        className={s.copyButton}
        title="Copy code"
        type="button"
        onClick={handleCopy}
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      </button>
      <SyntaxHighlighter
        customStyle={{
          margin: 0,
          borderRadius: "6px",
          fontSize: "12px",
          padding: "8px 8px 8px 4px",
        }}
        language={language}
        PreTag="div"
        showLineNumbers={true}
        style={codeTheme}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
