import type { Prompt } from "@pilot43/protocol"

/**
 * A slash command as stored before prompts replaced them (database v4 and
 * older).
 */
export interface LegacyCommand {
  builtin?: boolean
  description?: string
  id: string
  name: string
  prompt: string
}

/**
 * Converts a stored slash command into a prompt: the command name becomes the
 * title and its prompt the text. The name is kept in `legacyCommandName` so
 * messages sent with `/<name>` before the migration still expand to the same
 * text.
 */
export function migrateCommandToPrompt(command: LegacyCommand): Prompt {
  return {
    builtin: false,
    id: command.id,
    legacyCommandName: command.name,
    text: command.prompt,
    title: command.name,
  }
}
