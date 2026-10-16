import type { Chat, MessageRun } from "./entities"

export type PageContextUpdateReason =
  | "selectionChanged"
  | "tabActivated"
  | "tabCreated"
  | "tabRemoved"
  | "tabUpdated"

/**
 * Push notification telling clients that backend or page-context data has
 * changed and should be refetched. Transport-neutral: each platform wraps it
 * in its own envelope (e.g. a `target` field for Chrome runtime messaging).
 */
export type ApiNotification =
  | {
      action: "messageRunUpdated"
      payload: {
        chatId: Chat["id"]
        messageRunId: MessageRun["id"]
      }
    }
  | {
      action: "pageContextUpdated"
      payload: {
        reason: PageContextUpdateReason
      }
    }

export type ApiNotificationListener = (notification: ApiNotification) => void

/**
 * Source of {@link ApiNotification}s. Returns a function that removes the
 * listener.
 */
export interface ApiNotificationSource {
  subscribe(listener: ApiNotificationListener): () => void
}
