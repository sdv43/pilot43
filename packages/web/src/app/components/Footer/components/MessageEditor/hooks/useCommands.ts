import { useMemo } from "react"

import type { EditorCommandOption } from "../components/Editor/types"

import {
  usePageContentGet,
  usePageContentSelectionGet,
} from "../../../../../../queries/pageContent"
import { usePromptGet } from "../../../../../../queries/prompt"
import { createPageCommand, createSelectionCommand } from "../../../utils"
import { commandCharacterRegexNot } from "../components/Editor/const"

function sanitizeCommand(command: string): string {
  let result = command

  if (command.length > 30) {
    result = `${result.substring(0, 29)}...`
  }

  return result.replace(commandCharacterRegexNot, "_")
}

function createPageSnapshotKey(id: number, url: string) {
  return createPageCommand(`${id}:${encodeURIComponent(url)}`)
}

export function useCommands() {
  const { data: pages } = usePageContentGet()
  const { data: selection } = usePageContentSelectionGet({
    throwOnError: false,
  })
  const { data: prompts } = usePromptGet()

  return useMemo<EditorCommandOption[]>(() => {
    const options: EditorCommandOption[] = (prompts ?? []).map((prompt) => ({
      key: prompt.id,
      command: sanitizeCommand(prompt.title),
      prompt,
      type: "slash",
    }))

    pages?.forEach((page) => {
      const command = sanitizeCommand(
        createPageCommand(`${page.title ?? page.id}`),
      )

      options.push({
        attachment: page,
        key: createPageSnapshotKey(page.id, page.url),
        command,
        type: "hash",
      })
    })

    const selectionCommand = sanitizeCommand(
      selection ? `selection:${selection.content}` : "selection:no_selection",
    )

    options.push({
      attachment: selection ?? undefined,
      key: createSelectionCommand(selection?.uniqueKey ?? "unavailable"),
      command: selectionCommand,
      disabled: !selection,
      type: "hash",
    })

    return options
  }, [pages, prompts, selection])
}
