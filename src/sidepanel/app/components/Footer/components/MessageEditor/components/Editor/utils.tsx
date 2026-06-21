import type {
  EditorCommandOption,
  EditorParsedCommand,
  EditorValue,
} from "./types"

import { commandCharacterRegex } from "./const"

export function isCommandBoundary(previousCharacter: string | undefined) {
  if (!previousCharacter) {
    return true
  }

  return /\s/.test(previousCharacter)
}

/**
 * Slash commands (`/<name>`) are only valid at the very start of the message.
 * They expand into a prompt when the message is sent, so allowing them mid-text
 * would make the replacement ambiguous. Hash commands (`#<name>`) reference
 * attachments and may appear anywhere a word boundary allows.
 */
export function isSlashCommandStart(index: number) {
  return index === 0
}

export function isCommandCharacter(character: string | undefined) {
  if (!character) {
    return false
  }

  return commandCharacterRegex.test(character)
}

export function prepareValue(
  value: EditorValue,
  commands: EditorCommandOption[],
) {
  const { text, commands: existingCommands } = value
  const newCommands: EditorParsedCommand[] = []

  for (let index = 0; index < text.length; index += 1) {
    const prefix = text[index]
    const isSlash = prefix === "/"
    const isHash = prefix === "#"

    if (
      (!isSlash && !isHash) ||
      !isCommandBoundary(text[index - 1]) ||
      (isSlash && !isSlashCommandStart(index))
    ) {
      continue
    }

    let cursor = index + 1
    while (cursor < text.length && isCommandCharacter(text[cursor])) {
      cursor += 1
    }

    const commandName = text.slice(index + 1, cursor)
    const type = isSlash ? "slash" : "hash"
    const start = index
    const end = cursor

    const existing = existingCommands.find(
      (c) =>
        c.start === start &&
        c.end === end &&
        c.command === commandName &&
        c.type === type,
    )

    if (existing) {
      newCommands.push(existing)
    } else {
      const option = commands.find(
        (o) => o.command === commandName && o.type === type,
      )
      newCommands.push({
        key: option?.key ?? commandName,
        command: commandName,
        end,
        option,
        start,
        type,
      })
    }

    if (cursor > index + 1) {
      index = cursor - 1
    }
  }

  return {
    ...value,
    commands: newCommands,
  }
}
