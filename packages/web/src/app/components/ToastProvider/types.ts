import type { ReactNode } from "react"

export type ToastVariant = "error" | "info" | "success"

export interface Toast {
  id: string
  message: ReactNode
  variant?: ToastVariant
}

export interface ToastStore {
  toasts: Toast[]
  addToast: (message: ReactNode, variant?: ToastVariant) => void
  removeToast: (id: string) => void
}
