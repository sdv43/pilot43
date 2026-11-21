import type { OpenTab } from "@pilot43/protocol"

import type { EditorCommandOption } from "../MessageEditor/components/Editor/types"

import {
  getSelectionOption,
  getTabOptions,
} from "../BottomBar/components/AttachMenu/utils"
import { type AttachSuggestionOption } from "./types"

/**
 * What the composer offers to attach: the page selection when there is one,
 * else the tab the user is looking at. Whatever is already attached is skipped,
 * so attaching the selection falls back to offering the tab.
 */
export function getAttachSuggestion(
  options: EditorCommandOption[],
  attachedKeys: readonly string[],
): AttachSuggestionOption | undefined {
  const isAttached = (option: EditorCommandOption) =>
    attachedKeys.includes(option.key)
  const selection = getSelectionOption(options)

  if (selection?.attachment && !isAttached(selection)) {
    return { kind: "selection", option: selection }
  }

  const tab = getTabOptions(options).find(
    (option) => (option.attachment as OpenTab | undefined)?.active,
  )

  if (tab && !isAttached(tab)) {
    return { kind: "tab", option: tab }
  }

  return undefined
}

/** One-line preview of selected text: whitespace collapsed, cut at `max`. */
export function getSelectionPreview(content: string, max = 40) {
  const text = content.replace(/\s+/g, " ").trim()

  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}
