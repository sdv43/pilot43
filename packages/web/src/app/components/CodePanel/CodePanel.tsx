import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "../../../shared/cn"
import { IconButton } from "../IconButton"
import { HighlightedCode } from "../Markdown/components/CodeBlock"
import s from "./CodePanel.module.css"
import { type CodePanelProps } from "./types"
import { countLines } from "./utils"

/** Labelled, copyable block of code such as tool input or output. */
export function CodePanel({
  className,
  code,
  "data-testid": dataTestId,
  label,
  language = "json",
  maxLines,
  meta,
  tone = "default",
}: CodePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const isCollapsible = maxLines !== undefined && countLines(code) > maxLines
  const isCollapsed = isCollapsible && !isExpanded

  return (
    <section className={cn(s.codePanel, className)} data-testid={dataTestId}>
      <div className={s.header}>
        <h3 className={s.label}>{label}</h3>
        {meta ? <span className={s.meta}>{meta}</span> : null}
        <IconButton
          aria-label={`Copy ${label.toLowerCase()}`}
          icon={isCopied ? <CheckIcon /> : <CopyIcon />}
          size="small"
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setIsCopied(true)
              setTimeout(() => setIsCopied(false), 1500)
            })
          }}
        />
      </div>
      <div
        className={s.code}
        data-collapsed={isCollapsed}
        data-tone={tone}
        style={
          isCollapsed
            ? { maxHeight: `${(maxLines ?? 0) * 18 + 20}px` }
            : undefined
        }
      >
        {tone === "danger" ? (
          <pre className={s.plain}>{code}</pre>
        ) : (
          <HighlightedCode
            code={code}
            customStyle={{ background: "transparent", padding: 0 }}
            language={language}
          />
        )}
      </div>
      {isCollapsible ? (
        <button
          className={s.toggle}
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? "Show less" : "Show full output"}
        </button>
      ) : null}
    </section>
  )
}
