import type { Chat, MessageRun } from "@/shared/api"

export type PageContextUpdateReason =
  | "selectionChanged"
  | "tabActivated"
  | "tabCreated"
  | "tabRemoved"
  | "tabUpdated"

export type SidepanelNotification =
  | {
      target: "sidepanel"
      action: "messageRunUpdated"
      payload: {
        chatId: Chat["id"]
        messageRunId: MessageRun["id"]
      }
    }
  | {
      target: "sidepanel"
      action: "pageContextUpdated"
      payload: {
        reason: PageContextUpdateReason
      }
    }
