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

/**
 * Builds a stable signature of the option groups currently passed to the
 * selector. It only changes when the set of groups or the options within a
 * group change, so it can be used to detect data/shape changes (e.g. the
 * ModelSelector search input re-filters the model list) without reacting to
 * every re-render.
 */
export function getGroupsSignature(entries: SelectorEntry[]): string {
  return entries
    .filter(isOptionGroup)
    .map((entry) => {
      const optionValues = entry.options.map((option) => option.value).join(",")
      return `${entry.id}::${optionValues}`
    })
    .join("|")
}
