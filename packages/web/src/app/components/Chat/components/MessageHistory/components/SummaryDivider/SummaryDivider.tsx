import { FoldVerticalIcon } from "lucide-react"

import type { SummaryDividerProps } from "./types"

import { cn } from "../../../../../../../shared/cn"
import { Loader } from "../../../../../Loader"
import s from "./SummaryDivider.module.css"

/**
 * Line in the message list where the earlier messages the model gets as a
 * summary end (see `Chat.historySummary`), or the summary being written.
 */
export function SummaryDivider({
  className,
  isWorking = false,
  ...props
}: SummaryDividerProps) {
  return (
    <div
      {...props}
      className={cn(s.summaryDivider, className)}
      data-testid={isWorking ? "summary-divider-working" : "summary-divider"}
      role="status"
    >
      <span className={s.line} />
      <span className={s.label}>
        {isWorking ? (
          <Loader aria-hidden="true" size={14} />
        ) : (
          <FoldVerticalIcon aria-hidden="true" size={14} />
        )}
        {isWorking
          ? "Summarising earlier messages…"
          : "Earlier messages summarised"}
      </span>
      <span className={s.line} />
    </div>
  )
}
