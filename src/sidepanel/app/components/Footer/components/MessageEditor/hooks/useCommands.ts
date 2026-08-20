import { useMemo } from "react"

import { builtinCommands } from "@/shared/const"
import { useCommandGet } from "@/sidepanel/queries/command"
import {
  usePageContentGet,
  usePageContentSelectionGet,
} from "@/sidepanel/queries/pageContent"

import type { EditorCommandOption } from "../components/Editor/types"

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
  const { data: commands } = useCommandGet({ throwOnError: false })

  return useMemo<EditorCommandOption[]>(() => {
    const slashCommands = [...builtinCommands, ...(commands ?? [])]
    const options: EditorCommandOption[] = slashCommands.map((command) => ({
      key: command.id,
      command: command.name,
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
  }, [commands, pages, selection])
}
