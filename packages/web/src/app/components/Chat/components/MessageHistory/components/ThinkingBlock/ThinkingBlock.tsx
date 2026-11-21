import {
  ChevronDownIcon,
  ChevronRightIcon,
  LightbulbIcon,
  LoaderCircleIcon,
} from "lucide-react"
import { useState } from "react"

import { Markdown } from "../../../../../Markdown"
import s from "./ThinkingBlock.module.css"
import { type ThinkingBlockProps } from "./types"
import { getThinkingPreview, getThinkingSummary } from "./utils"

/**
 * Reasoning above a reply (Figma component "Reasoning"): live and muted while
 * the model thinks, then "Thought for N s", collapsed until clicked.
 */
export function ThinkingBlock({
  isThinking,
  thinkingMs,
  thoughts,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isThinking) {
    return (
      <div
        className={s.thinkingBlock}
        data-state="thinking"
        data-testid="assistant-thoughts"
      >
        <span className={s.toggle} data-testid="spoiler-summary">
          <LoaderCircleIcon aria-hidden="true" className={s.spinner} />
          <span>Thinking…</span>
        </span>
        <p aria-live="off" className={s.preview}>
          {getThinkingPreview(thoughts)}
        </p>
      </div>
    )
  }

  return (
    <div className={s.thinkingBlock} data-testid="assistant-thoughts">
      <button
        aria-expanded={isOpen}
        className={s.toggle}
        data-testid="spoiler-summary"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <LightbulbIcon aria-hidden="true" />
        <span>{getThinkingSummary(thinkingMs)}</span>
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
