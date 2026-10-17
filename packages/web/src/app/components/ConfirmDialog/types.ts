import type { ReactNode } from "react"

export interface ConfirmDialogProps {
  children?: ReactNode
  confirmLabel: string
  /**
   * When set, the confirm button stays disabled until the user types this
   * exact text.
   */
  confirmText?: string
  icon?: ReactNode
  isPending?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  tone?: "danger" | "primary"
}
