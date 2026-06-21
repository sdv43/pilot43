import type { Command } from "./entities"

/**
 * Built-in slash commands that ship with the extension. They are hardcoded
 * (never persisted to the database) and read-only for users, so they are not
 * shown in the settings command list. They are, however, available in the
 * editor autocomplete and expanded into their prompt when a message is sent.
 */
export const builtinCommands: Command[] = [
  // {
  //   id: "builtin:summarize",
  //   name: "summarize",
  //   builtin: true,
  //   description: "Summarize the attached page content or selection.",
  //   prompt: [
  //     "Summarize the provided context concisely.",
  //     "If a page snapshot or text selection is attached, base your summary on it.",
  //     "Highlight the key points and any actionable takeaways.",
  //   ].join("\n"),
  // },
]
