import { type EditorCommandOption, type EditorParsedCommand } from "../../types"
import { isCommandCharacter, isSlashCommandStart } from "../../utils"
import { type ActiveAutocompleteCommand } from "./types"

export function getActiveAutocompleteCommand(
  text: string,
  commands: EditorParsedCommand[],
  selectionStart: number,
  selectionEnd: number,
): ActiveAutocompleteCommand | null {
  if (selectionStart !== selectionEnd) return null

  for (const command of commands) {
    const commandValueStart = command.start + 1

    if (selectionStart < commandValueStart || selectionStart > command.end) {
      continue
    }

    // Slash commands are only valid at the very start of the message. If the
    // parsed command is a slash command that is not at position 0, ignore it
    // so no autocomplete is offered and it is treated as plain text.
    if (command.type === "slash" && !isSlashCommandStart(command.start)) {
      return null
    }

    const query = text.slice(commandValueStart, selectionStart)

    if (![...query].every((character) => isCommandCharacter(character))) {
      return null
    }

    return {
      end: command.end,
      kind: command.type,
      query,
      start: command.start,
    }
  }

  return null
}

function shouldIncludeOption(option: EditorCommandOption, rawQuery: string) {
  const query = rawQuery.toLowerCase()

  if (query.length === 0) {
    return true
  }

  return option.command.toLowerCase().includes(query)
}

export function filterOptions(
  options: EditorCommandOption[],
  activeCommand: ActiveAutocompleteCommand,
) {
  return options.filter(
    (option) =>
      option.type === activeCommand.kind &&
      shouldIncludeOption(option, activeCommand.query),
  )
}
