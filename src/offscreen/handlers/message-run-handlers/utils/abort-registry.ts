/**
 * In-memory registry of in-progress message-run generations keyed by message
 * run id. Each entry holds an `AbortController` that can be triggered to
 * cancel the streaming response for the corresponding run.
 *
 * Entries are only kept while a generation is active; they are removed once
 * the run completes, fails, or is stopped.
 */
const controllers = new Map<string, AbortController>()

/**
 * Registers an abort controller for an active message run and returns the
 * corresponding abort signal. If a controller is already registered for the
 * given id it is replaced.
 */
export function registerAbortController(
  messageRunId: string,
  controller: AbortController,
): AbortSignal {
  controllers.set(messageRunId, controller)
  return controller.signal
}

/**
 * Removes the abort controller associated with a message run (e.g. when the
 * generation finishes). Calling `abort` on a removed controller is a no-op
 * because the controller is no longer tracked.
 */
export function unregisterAbortController(messageRunId: string): void {
  controllers.delete(messageRunId)
}

/**
 * Triggers the abort controller for the given message run id, if one is
 * currently registered. Returns whether an active generation was found and
 * aborted.
 */
export function abortMessageRun(messageRunId: string): boolean {
  const controller = controllers.get(messageRunId)
  if (!controller) {
    return false
  }

  controller.abort()
  controllers.delete(messageRunId)
  return true
}
