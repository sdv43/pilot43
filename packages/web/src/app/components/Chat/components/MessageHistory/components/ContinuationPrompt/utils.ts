import type { ContinuationPrompt } from "@pilot43/protocol"

/** "Retrying automatically in 6s · attempt 2 of 3", or the manual fallback. */
export function getRetryDetail(
  prompt: Pick<ContinuationPrompt, "attempt" | "maxAttempts" | "retryAt">,
  now: number,
) {
  if (prompt.retryAt === undefined) {
    return "Automatic retries did not help. Retry when you are ready."
  }

  const seconds = Math.max(0, Math.ceil((prompt.retryAt - now) / 1000))
  const attempt =
    prompt.attempt && prompt.maxAttempts
      ? ` · attempt ${prompt.attempt} of ${prompt.maxAttempts}`
      : ""

  return seconds > 0
    ? `Retrying automatically in ${seconds}s${attempt}`
    : `Retrying…${attempt}`
}
