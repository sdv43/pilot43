import { ScissorsIcon } from "lucide-react"

import { cn } from "@/sidepanel/shared/cn"

import type { HistoryDividerProps } from "./types"

import s from "./HistoryDivider.module.css"

export function HistoryDivider({
  className,
  isPending,
  onDeleteAfter,
  ...props
}: HistoryDividerProps) {
  return (
    <div
      {...props}
      className={cn(s.historyDivider, className)}
      data-testid="history-divider"
    >
      <span className={s.line} />
      <button
        className={s.button}
        data-testid="history-divider-button"
        disabled={isPending}
        title="Roll back to this message and continue from here"
        type="button"
        onClick={onDeleteAfter}
      >
        <ScissorsIcon size={12} />
        <span className={s.buttonLabel}>Roll back here</span>
      </button>
      <span className={s.line} />
    </div>
  )
}
