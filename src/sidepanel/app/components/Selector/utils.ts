import type {
  SelectorEntry,
  SelectorOption,
  SelectorOptionGroup,
} from "./types"

export function flattenOptions(entries: SelectorEntry[]): SelectorOption[] {
  return entries.flatMap((entry) =>
    isOptionGroup(entry) ? entry.options : [entry],
  )
}

export function getOptionButtons(container: HTMLDivElement | null) {
  if (!container) {
    return []
  }

  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      "button[data-option='true']:not(:disabled)",
    ),
  )
}

export function getFocusOnOpenTarget(container: HTMLDivElement | null) {
  if (!container) {
    return null
  }

  return container.querySelector<HTMLElement>(
    "[data-selector-focus-on-open]:not([disabled])",
  )
}

export function isOptionGroup(
  entry: SelectorEntry,
): entry is SelectorOptionGroup {
  return "options" in entry
}
