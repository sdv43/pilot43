import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism"

import type { CodeBlockProps } from "./types"

import s from "./CodeBlock.module.css"

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
