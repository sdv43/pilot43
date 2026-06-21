import type { ReactNode } from "react"

import { create } from "zustand"

import type { ToastStore, ToastVariant } from "./types"

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message: ReactNode, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).substring(2, 9)

    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }))

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 5000)
  },
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

export const toast = (message: ReactNode, variant: ToastVariant = "info") => {
  useToastStore.getState().addToast(message, variant)
}
