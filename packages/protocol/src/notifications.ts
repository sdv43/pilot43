import type { Chat, MessageAssistant, MessageRun } from "./entities"

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
      /**
       * Text streamed into an assistant message so far. Sent while a reply
       * streams, instead of `messageRunUpdated`, so clients can patch the
       * message in place without refetching the chat's runs. Carries the full
       * text (not a delta), so a missed or reordered notification is harmless.
       */
      action: "messageRunStreamed"
      payload: {
        chatId: Chat["id"]
        message: Pick<
          MessageAssistant,
          "content" | "id" | "thinkingMs" | "thoughts"
        >
        messageRunId: MessageRun["id"]
      }
    }
  | {
      /** Chats were deleted or created outside a user action (retention). */
      action: "chatsChanged"
    }
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
