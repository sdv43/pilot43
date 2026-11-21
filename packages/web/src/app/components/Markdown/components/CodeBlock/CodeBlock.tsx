import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import type { CodeBlockProps } from "./types"

import s from "./CodeBlock.module.css"
import { HighlightedCode } from "./components/HighlightedCode"

/**
 * Fenced code in a reply (Figma "Code Block"): language and Copy in a header;
 * lines never wrap, the body scrolls sideways with an edge fade.
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={s.codeWrapper} data-testid="code-block">
      <div className={s.header}>
        <span className={s.language}>{language ?? "code"}</span>
        <button
          aria-label="Copy code"
          className={s.copyButton}
          title="Copy code"
          type="button"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className={s.body}>
        <HighlightedCode
          code={code}
          customStyle={{
            background: "transparent",
            borderRadius: 0,
            fontSize: "12px",
            margin: 0,
            overflow: "visible",
            padding: "10px 12px 12px",
            width: "max-content",
          }}
          language={language}
        />
      </div>
    </div>
  )
}
