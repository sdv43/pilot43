import type { ApiNotification } from "@pilot43/protocol"

export interface MessageFormat<T = unknown, A = unknown, P = unknown> {
  target: T
  action: A
  payload: P
}

export interface MessageResponseFormat<R = unknown, E extends string = string> {
  result: R
  error?: E
}

/**
 * {@link ApiNotification} wrapped in the Chrome runtime message envelope
 * addressed to the side panel.
 */
export type SidepanelNotification = ApiNotification & { target: "sidepanel" }
