import { useSyncExternalStore } from "react"

import { useStore } from "../app/store"

export type ResolvedTheme = "dark" | "light"

export type Theme = "system" | ResolvedTheme

const darkQuery = "(prefers-color-scheme: dark)"

/**
 * Pins `color-scheme` (and so every `light-dark()` token in index.css) through
 * `data-theme` on <html>. Without the attribute the OS preference applies.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === "system") {
    delete root.dataset.theme
  } else {
    root.dataset.theme = theme
  }
}

/** Theme actually shown: the stored choice, or the OS one for `system`. */
export function useResolvedTheme(): ResolvedTheme {
  const theme = useStore((state) => state.theme)
  const prefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia(darkQuery).matches,
  )

  if (theme !== "system") {
    return theme
  }

  return prefersDark ? "dark" : "light"
}

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(darkQuery)
  query.addEventListener("change", onChange)

  return () => {
    query.removeEventListener("change", onChange)
  }
}
