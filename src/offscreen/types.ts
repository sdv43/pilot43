import type { Chat, MessageRun } from "@/shared/api"
import type { MessageFormats } from "@/shared/api/types"

export type ActionAppSettingsGet = MessageFormats<"appSettingsGet", "offscreen">
export type ActionAppSettingsUpdate = MessageFormats<
  "appSettingsUpdate",
  "offscreen"
>
export type ActionChatDelete = MessageFormats<"chatDelete", "offscreen">
export type ActionChatGetByWorkspace = MessageFormats<
  "chatGetByWorkspace",
  "offscreen"
>
export type ActionChatMessageRunStop = MessageFormats<
  "chatMessageRunStop",
  "offscreen"
>
export type ActionChatMessageRunDelete = MessageFormats<
  "chatMessageRunDelete",
  "offscreen"
>
export type ActionChatMessageRunDeleteAfter = MessageFormats<
  "chatMessageRunDeleteAfter",
  "offscreen"
>
export type ActionChatMessageRunGet = MessageFormats<
  "chatMessageRunGet",
  "offscreen"
>
export type ActionChatMessageRunAnswer = MessageFormats<
  "chatMessageRunAnswer",
  "offscreen"
>
export type ActionChatMessageRunRetry = MessageFormats<
  "chatMessageRunRetry",
  "offscreen"
>
export type ActionChatMessageSend = MessageFormats<
  "chatMessageSend",
  "offscreen"
>
export type ActionChatSettingsUpdate = MessageFormats<
  "chatSettingsUpdate",
  "offscreen"
>
export type ActionChatTodoListClear = MessageFormats<
  "chatTodoListClear",
  "offscreen"
>
export type ActionChatTokenEstimateGet = MessageFormats<
  "chatTokenEstimateGet",
  "offscreen"
>
export type ActionCommandGet = MessageFormats<"commandGet", "offscreen">
export type ActionCommandCreate = MessageFormats<"commandCreate", "offscreen">
export type ActionCommandUpdate = MessageFormats<"commandUpdate", "offscreen">
export type ActionCommandDelete = MessageFormats<"commandDelete", "offscreen">
export type ActionModelProviderCheck = MessageFormats<
  "modelProviderCheck",
  "offscreen"
>
export type ActionModelProviderCreate = MessageFormats<
  "modelProviderCreate",
  "offscreen"
>
export type ActionModelProviderDelete = MessageFormats<
  "modelProviderDelete",
  "offscreen"
>
export type ActionModelProviderGet = MessageFormats<
  "modelProviderGet",
  "offscreen"
>
export type ActionModelProviderModelGet = MessageFormats<
  "modelProviderModelGet",
  "offscreen"
>
export type ActionModelProviderTypeGet = MessageFormats<
  "modelProviderTypeGet",
  "offscreen"
>
export type ActionModelProviderUpdate = MessageFormats<
  "modelProviderUpdate",
  "offscreen"
>
export type ActionModelToolGet = MessageFormats<"modelToolGet", "offscreen">
export type ActionMcpServerGet = MessageFormats<"mcpServerGet", "offscreen">
export type ActionMcpServerUpdate = MessageFormats<
  "mcpServerUpdate",
  "offscreen"
>
export type ActionMcpServerToolsGet = MessageFormats<
  "mcpServerToolsGet",
  "offscreen"
>
export type ActionWorkspaceCreate = MessageFormats<
  "workspaceCreate",
  "offscreen"
>
export type ActionWorkspaceDelete = MessageFormats<
  "workspaceDelete",
  "offscreen"
>
export type ActionWorkspaceGet = MessageFormats<"workspaceGet", "offscreen">
export type ActionWorkspaceUpdate = MessageFormats<
  "workspaceUpdate",
  "offscreen"
>

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
