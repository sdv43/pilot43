import { BrainIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { Markdown } from "../../../../../Markdown"
import s from "./ThinkingBlock.module.css"
import { type ThinkingBlockProps } from "./types"

/** Collapsible reasoning trace of a reply. */
export function ThinkingBlock({ isThinking, thoughts }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={s.thinkingBlock} data-testid="assistant-thoughts">
      <button
        aria-expanded={isOpen}
        className={s.toggle}
        data-testid="spoiler-summary"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <BrainIcon aria-hidden="true" />
        <span>{isThinking ? "Thinking…" : "Thoughts"}</span>
        {isOpen ? (
          <ChevronDownIcon aria-hidden="true" />
        ) : (
          <ChevronRightIcon aria-hidden="true" />
        )}
      </button>
      {isOpen ? (
        <div className={s.content} data-testid="spoiler-content">
          <Markdown>{thoughts}</Markdown>
        </div>
      ) : null}
    </div>
  )
}
