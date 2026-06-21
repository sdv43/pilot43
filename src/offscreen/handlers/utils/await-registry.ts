/**
 * In-memory registry of pending follow-up question answers keyed by message
 * run id. When the model calls `ask_followup_question`, the generation loop
 * awaits the stored promise; resolving it (via `resolveMessageRunAnswer`) lets
 * the loop continue with the user's answer.
 *
 * Entries are only kept while a generation is paused waiting for an answer;
 * they are removed once the answer is provided or the run is aborted.
 */
const resolvers = new Map<
  string,
  { resolve: (answer: string) => void; reject: (error: Error) => void }
>()

/**
 * Returns a promise that resolves with the user's answer for the given message
 * run id, registering the resolver so the offscreen handler can fulfil it when
 * the sidepanel submits an answer.
 */
export function waitForMessageRunAnswer(messageRunId: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    resolvers.set(messageRunId, { reject, resolve })
  })
}

/**
 * Resolves the pending answer promise for a message run, if one is waiting.
 * Returns whether a paused generation was found and resumed.
 */
export function resolveMessageRunAnswer(
  messageRunId: string,
  answer: string,
): boolean {
  const entry = resolvers.get(messageRunId)
  if (!entry) {
    return false
  }

  resolvers.delete(messageRunId)
  entry.resolve(answer)
  return true
}

/**
 * Rejects the pending answer promise for a message run (e.g. when the user
 * stops or deletes the run while it is awaiting input). Returns whether a
 * paused generation was found.
 */
export function rejectMessageRunAnswer(
  messageRunId: string,
  error: Error,
): boolean {
  const entry = resolvers.get(messageRunId)
  if (!entry) {
    return false
  }

  resolvers.delete(messageRunId)
  entry.reject(error)
  return true
}

/**
 * Returns whether a message run is currently paused waiting for an answer.
 */
export function isMessageRunAwaitingAnswer(messageRunId: string): boolean {
  return resolvers.has(messageRunId)
}
