import { type CSSProperties, useRef } from "react"

import type { PopoverProps } from "./types"

import { cn } from "../../../shared/cn"
import { mergeRef } from "../../../shared/mergeRef"
import { usePopoverToggle } from "./hooks/usePopoverToggle"
import s from "./Popover.module.css"

export function Popover({
  anchorName,
  children,
  className,
  onOpenChange,
  ref,
  style,
  popover = "auto",
  ...props
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const mergedRef = mergeRef(popoverRef, ref)

  usePopoverToggle(popoverRef, onOpenChange)

  return (
    <div
      {...props}
      ref={mergedRef}
      className={cn(s.popover, className)}
      popover={popover}
      style={
        {
          ...style,
          "--popover-anchor-name":
            anchorName ??
            (style as Record<string, string | undefined>)[
              "--popover-anchor-name"
            ],
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
