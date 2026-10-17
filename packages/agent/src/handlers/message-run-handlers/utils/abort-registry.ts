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
 * Promises that settle once the generation loop owning a controller has
 * unregistered it, so callers can wait for a loop to fully wind down.
 */
const settledByController = new WeakMap<
  AbortController,
  { promise: Promise<void>; resolve: () => void }
>()

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

  let resolve: () => void = () => {}
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  settledByController.set(controller, { promise, resolve })

  return controller.signal
}

/**
 * Removes the abort controller associated with a message run (e.g. when the
 * generation finishes). Calling `abort` on a removed controller is a no-op
 * because the controller is no longer tracked.
 */
export function unregisterAbortController(
  messageRunId: string,
  controller?: AbortController,
): void {
  const target = controller ?? controllers.get(messageRunId)

  // A loop that was superseded (e.g. by a retry) must not remove the
  // controller registered by its replacement.
  if (controllers.get(messageRunId) === target) {
    controllers.delete(messageRunId)
  }

  if (target) {
    settledByController.get(target)?.resolve()
  }
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

/**
 * Aborts the active generation for a message run and waits until its loop has
 * finished unwinding, so it can no longer write stale state. Resolves
 * immediately when no generation is registered.
 */
export async function abortMessageRunAndWait(
  messageRunId: string,
): Promise<void> {
  const controller = controllers.get(messageRunId)
  if (!controller) {
    return
  }

  const settled = settledByController.get(controller)
  abortMessageRun(messageRunId)
  await settled?.promise
}
