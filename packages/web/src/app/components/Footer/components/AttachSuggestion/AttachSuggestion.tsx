import type { OpenTab, PageContentSelection } from "@pilot43/protocol"

import { PlusIcon, TextSelectIcon } from "lucide-react"

import { useHandleFilesAttached } from "../../hooks/useHandleFilesAttached"
import { useFooterStore } from "../../store"
import s from "./AttachSuggestion.module.css"
import { type AttachSuggestionProps } from "./types"
import { getAttachSuggestion, getSelectionPreview } from "./utils"

/**
 * Dashed chip offering one click to attach the text selected on the page or,
 * without a selection, the tab the user is looking at (Figma screen 07).
 * Hidden once both are attached.
 */
export function AttachSuggestion({ textareaRef }: AttachSuggestionProps) {
  const { commands, insertOptions } = useHandleFilesAttached(textareaRef)
  const attachments = useFooterStore((state) => state.attachments)
  const suggestion = getAttachSuggestion(
    commands,
    attachments.map((item) => item.key),
  )

  if (!suggestion) {
    return null
  }

  const { kind, option } = suggestion
  let ariaLabel: string
  let label: string
  let title: string

  if (kind === "selection") {
    const selection = option.attachment as PageContentSelection
    const preview = getSelectionPreview(selection.content)

    ariaLabel = `Attach selected text: ${preview}`
    label = `Selected text: “${preview}”`
    title = `Attach selected text\n\n${selection.content}`
  } else {
    const tab = option.attachment as OpenTab
    const tabTitle = tab.title || tab.url

    ariaLabel = `Attach current tab: ${tabTitle}`
    label = tabTitle
    title = `Attach ${tabTitle}`
  }

  const Icon = kind === "selection" ? TextSelectIcon : PlusIcon

  return (
    <button
      aria-label={ariaLabel}
      className={s.suggestion}
      data-kind={kind}
      data-testid="attach-suggestion"
      title={title}
      type="button"
      onClick={() => insertOptions([option])}
    >
      <Icon aria-hidden="true" className={s.icon} />
      <span className={s.label}>{label}</span>
    </button>
  )
}
