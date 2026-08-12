import type { Command } from "./api/entities"

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

/**
 * Message shown when the assistant reaches the tool round-trip limit and the
 * user is asked to confirm whether generation should continue. The user can
 * choose to continue (resetting the counter for another batch) or stop.
 */
export const continuationPromptMessage =
  "The assistant has been working on its own for a while. Continue?"

/**
 * Answer value submitted by the continuation prompt UI when the user chooses
 * to let the assistant keep working. Any other answer (or a stop) stops the
 * run. Shared between the offscreen streaming loop and the sidepanel UI so
 * both sides agree on the "continue" sentinel.
 */
export const continuationAnswerContinue = "continue"
