import type { Prompt } from "./entities"

/**
 * Built-in prompts that ship with the extension. They are hardcoded (never
 * persisted to the database), listed read-only in Settings → Prompts and
 * offered in the `/` menu.
 */
export const builtinPrompts: Prompt[] = []

/** Maximum length of {@link Prompt.text}. */
export const promptTextMaxLength = 8000

/**
 * Message shown when the assistant reaches the tool round-trip limit and the
 * user is asked to confirm whether generation should continue. The user can
 * choose to continue (resetting the counter for another batch) or stop.
 */
export const continuationPromptMessage =
  "The assistant has been working on its own for a while. Continue?"

/** Message of the notice shown when a provider rate-limits a request. */
export function getRateLimitPromptMessage(providerName: string) {
  return `${providerName} rate limit reached (429). Wait a moment, then continue.`
}

/**
 * Answer value submitted by the continuation prompt UI when the user chooses
 * to let the assistant keep working. Any other answer (or a stop) stops the
 * run. Shared between the offscreen streaming loop and the sidepanel UI so
 * both sides agree on the "continue" sentinel.
 */
export const continuationAnswerContinue = "continue"

/**
 * Answers to a {@link ToolApprovalRequest}: run this call, run it and set the
 * tool to "Always allow" in the workspace, or skip it.
 */
export const toolApprovalAnswers = {
  allowOnce: "allow_once",
  alwaysAllow: "always_allow",
  deny: "deny",
} as const

/** Text sent to the model for a question the user skipped. */
export const skippedQuestionAnswer = "The user skipped this question."
