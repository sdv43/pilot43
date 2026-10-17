import type { LucideIcon } from "lucide-react"

import { CircleCheckIcon, CircleXIcon, InfoIcon, XIcon } from "lucide-react"
import { useEffect, useRef } from "react"

import type { ToastVariant } from "./types"

import { useToastStore } from "./store"
import s from "./ToastProvider.module.css"

const variantIcons: Record<ToastVariant, LucideIcon> = {
  error: CircleXIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
}

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)
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
      {toasts.map((t) => {
        const variant = t.variant ?? "info"
        const Icon = variantIcons[variant]

        return (
          <div
            key={t.id}
            className={s.toast}
            data-variant={variant}
            role="alert"
          >
            <Icon aria-hidden className={s.icon} />
            <div className={s.message}>{t.message}</div>
            <button
              aria-label="Dismiss"
              className={s.close}
              type="button"
              onClick={() => removeToast(t.id)}
            >
              <XIcon aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
