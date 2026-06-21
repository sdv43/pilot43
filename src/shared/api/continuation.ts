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
