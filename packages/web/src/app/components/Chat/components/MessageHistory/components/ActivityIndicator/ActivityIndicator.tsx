import { LoaderCircleIcon } from "lucide-react"

import s from "./ActivityIndicator.module.css"
import { type ActivityIndicatorProps } from "./types"

/** What the assistant is doing right now. */
export function ActivityIndicator({
  label,
  type = "dots",
}: ActivityIndicatorProps) {
  return (
    <div
      className={s.activityIndicator}
      data-testid="activity-indicator"
      role="status"
    >
      {type === "dots" ? (
        <span aria-hidden="true" className={s.dots}>
          <span />
          <span />
          <span />
        </span>
      ) : (
        <LoaderCircleIcon aria-hidden="true" className={s.spinner} />
      )}
      <span className={s.label}>{label}</span>
    </div>
  )
}
