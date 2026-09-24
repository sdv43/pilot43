import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import type { CodeBlockProps } from "./types"

import s from "./CodeBlock.module.css"
import { HighlightedCode } from "./components/HighlightedCode"

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
      <HighlightedCode
        code={code}
        customStyle={{
          borderRadius: "6px",
          fontSize: "12px",
          margin: 0,
          padding: "8px 8px 8px 4px",
        }}
        language={language}
        showLineNumbers={true}
      />
    </div>
  )
}
