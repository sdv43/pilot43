import type { EditorCommandOption } from "../../../MessageEditor/components/Editor/types"

import { isPageCommand, isSelectionCommand } from "../../../../utils"

/** `#` options of open tabs. */
export function getTabOptions(options: EditorCommandOption[]) {
  return options.filter(
    (option) =>
      option.type === "hash" && isPageCommand(option.key) && option.attachment,
  )
}

/** `#` option of the current page selection, if there is one. */
export function getSelectionOption(options: EditorCommandOption[]) {
  return options.find(
    (option) =>
      option.type === "hash" &&
      isSelectionCommand(option.key) &&
      !option.disabled,
  )
}

/** Host name of a URL for display (`linear.app`). */
export function getHost(url: string | undefined) {
  try {
    return url ? new URL(url).host : ""
  } catch {
    return url ?? ""
  }
}

export function getAttachTabsLabel(count: number) {
  if (count === 0) {
    return "Attach tabs"
  }

  return count === 1 ? "Attach tab" : `Attach ${count} tabs`
}
