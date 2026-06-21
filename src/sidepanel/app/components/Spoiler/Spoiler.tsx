import { ChevronDownIcon, ChevronLeftIcon } from "lucide-react"
import { useCallback, useState } from "react"

import { cn } from "@/sidepanel/shared/cn"

import type { SpoilerProps } from "./types"

import s from "./Spoiler.module.css"

export function Spoiler({
  children,
  maxHeight,
  isExpanded: controlledIsExpanded,
  defaultIsExpanded = false,
  onExpandedChange,
  labelOpen,
  labelClose,
  className,
  ...props
}: SpoilerProps) {
  const [uncontrolledIsExpanded, setUncontrolledIsExpanded] =
    useState(defaultIsExpanded)

  const isExpanded = controlledIsExpanded ?? uncontrolledIsExpanded

  const handleToggle = useCallback(() => {
    const nextExpanded = !isExpanded

    if (controlledIsExpanded === undefined) {
      setUncontrolledIsExpanded(nextExpanded)
    }

    onExpandedChange?.(nextExpanded)
  }, [isExpanded, controlledIsExpanded, onExpandedChange])

  return (
    <details className={cn(s.spoiler, className)} {...props}>
      <summary
        className={s.button}
        data-testid="spoiler-summary"
        onClick={handleToggle}
      >
        {isExpanded ? (labelClose ?? labelOpen) : labelOpen}
        {isExpanded ? (
          <ChevronDownIcon className={s.icon} size={14} />
        ) : (
          <ChevronLeftIcon className={s.icon} size={14} />
        )}
      </summary>

      <div
        className={s.content}
        data-expanded={isExpanded}
        data-testid="spoiler-content"
        style={{
          maxHeight: isExpanded && maxHeight ? `${maxHeight}px` : undefined,
        }}
      >
        {children}
      </div>
    </details>
  )
}
