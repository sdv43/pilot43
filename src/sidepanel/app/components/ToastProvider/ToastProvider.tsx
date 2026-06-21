import { useEffect, useRef } from "react"

import { cn } from "@/sidepanel/shared/cn"

import { useToastStore } from "./store"
import s from "./ToastProvider.module.css"

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const popoverNode = ref.current
    if (!popoverNode) return

    if (toasts.length > 0) {
      if (!popoverNode.matches(":popover-open")) {
        popoverNode.showPopover()
      }
    } else {
      if (popoverNode.matches(":popover-open")) {
        popoverNode.hidePopover()
      }
    }
  }, [toasts.length])

  return (
    <div ref={ref} className={s.container} popover="manual">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(s.toast, s[t.variant || "info"])}
          data-variant={t.variant || "info"}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
