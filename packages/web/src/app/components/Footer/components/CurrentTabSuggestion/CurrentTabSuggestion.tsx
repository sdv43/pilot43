import type { OpenTab } from "@pilot43/protocol"

import { PlusIcon } from "lucide-react"

import { useHandleFilesAttached } from "../../hooks/useHandleFilesAttached"
import { useFooterStore } from "../../store"
import { getTabOptions } from "../BottomBar/components/AttachMenu/utils"
import s from "./CurrentTabSuggestion.module.css"
import { type CurrentTabSuggestionProps } from "./types"

/**
 * Dashed chip offering the tab the user is looking at; one click attaches it
 * (Figma screen 07). Hidden once the tab is attached.
 */
export function CurrentTabSuggestion({
  textareaRef,
}: CurrentTabSuggestionProps) {
  const { commands, insertOptions } = useHandleFilesAttached(textareaRef)
  const attachments = useFooterStore((state) => state.attachments)
  const option = getTabOptions(commands).find(
    (item) => (item.attachment as OpenTab | undefined)?.active,
  )

  if (!option || attachments.some((item) => item.key === option.key)) {
    return null
  }

  const tab = option.attachment as OpenTab
  const title = tab.title || tab.url

  return (
    <button
      aria-label={`Attach current tab: ${title}`}
      className={s.suggestion}
      data-testid="current-tab-suggestion"
      title={`Attach ${title}`}
      type="button"
      onClick={() => insertOptions([option])}
    >
      <PlusIcon aria-hidden="true" className={s.icon} />
      <span className={s.label}>{title}</span>
    </button>
  )
}
