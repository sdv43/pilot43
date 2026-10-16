import type { MessageFormat, MessageResponseFormat } from "./types"

import { addMessageListener, sendMessage } from "./message-utils"

/**
 * Creates a client whose methods forward calls to the {@link serveRpc}
 * endpoint registered for `target`, over Chrome runtime messaging.
 */
export function createRpcClient<T extends object>(
  target: string,
  methods: readonly (keyof T & string)[],
): T {
  return Object.fromEntries(
    methods.map((method) => [
      method,
      (...args: unknown[]) =>
        sendMessage({ action: method, payload: args, target }),
    ]),
  ) as T
}

/**
 * Serves the `methods` of `api` to {@link createRpcClient} clients of
 * `target`. Each call responds with `{ result }`, or `{ error }` when the
 * method throws.
 */
export function serveRpc<T extends object>(
  target: string,
  api: T,
  methods: readonly (keyof T & string)[],
): void {
  for (const method of methods) {
    addMessageListener<
      MessageFormat<string, string, unknown[]>,
      MessageResponseFormat
    >(target, method, async ({ payload }) => {
      const call = api[method] as (...args: unknown[]) => unknown
      return { result: await call.apply(api, payload) }
    })
  }
}
