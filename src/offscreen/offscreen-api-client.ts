import { sendMessage } from "@/shared/chrome"

import type { ApiClient } from "../shared/api/api-client"
import type {
  ActionAppSettingsGet,
  ActionAppSettingsUpdate,
  ActionChatDelete,
  ActionChatGetByWorkspace,
  ActionChatMessageRunAnswer,
  ActionChatMessageRunDelete,
  ActionChatMessageRunDeleteAfter,
  ActionChatMessageRunGet,
  ActionChatMessageRunRetry,
  ActionChatMessageRunStop,
  ActionChatMessageSend,
  ActionChatSettingsUpdate,
  ActionChatTitleUpdate,
  ActionChatTodoListClear,
  ActionChatTokenEstimateGet,
  ActionCommandCreate,
  ActionCommandDelete,
  ActionCommandGet,
  ActionCommandUpdate,
  ActionMcpServerGet,
  ActionMcpServerToolsGet,
  ActionMcpServerUpdate,
  ActionModelProviderCheck,
  ActionModelProviderCreate,
  ActionModelProviderDelete,
  ActionModelProviderGet,
  ActionModelProviderModelGet,
  ActionModelProviderTypeGet,
  ActionModelProviderUpdate,
  ActionModelToolGet,
  ActionWorkspaceCreate,
  ActionWorkspaceDelete,
  ActionWorkspaceGet,
  ActionWorkspaceUpdate,
} from "./types"

export const offscreenApiClient: Omit<
  ApiClient,
  "pageContentGet" | "pageContentGetById" | "pageContentSelectionGet"
> = {
  appSettingsGet() {
    return sendMessage<
      ActionAppSettingsGet["message"],
      ActionAppSettingsGet["response"]
    >({
      target: "offscreen",
      action: "appSettingsGet",
      payload: [],
    })
  },

  appSettingsUpdate(settings) {
    return sendMessage<
      ActionAppSettingsUpdate["message"],
      ActionAppSettingsUpdate["response"]
    >({
      target: "offscreen",
      action: "appSettingsUpdate",
      payload: [settings],
    })
  },

  workspaceGet() {
    return sendMessage<
      ActionWorkspaceGet["message"],
      ActionWorkspaceGet["response"]
    >({
      target: "offscreen",
      action: "workspaceGet",
      payload: [],
    })
  },

  workspaceCreate(workspace) {
    return sendMessage<
      ActionWorkspaceCreate["message"],
      ActionWorkspaceCreate["response"]
    >({
      target: "offscreen",
      action: "workspaceCreate",
      payload: [workspace],
    })
  },

  workspaceUpdate(workspace) {
    return sendMessage<
      ActionWorkspaceUpdate["message"],
      ActionWorkspaceUpdate["response"]
    >({
      target: "offscreen",
      action: "workspaceUpdate",
      payload: [workspace],
    })
  },

  workspaceDelete(workspaceId) {
    return sendMessage<
      ActionWorkspaceDelete["message"],
      ActionWorkspaceDelete["response"]
    >({
      target: "offscreen",
      action: "workspaceDelete",
      payload: [workspaceId],
    })
  },

  chatGetByWorkspace(workspaceId) {
    return sendMessage<
      ActionChatGetByWorkspace["message"],
      ActionChatGetByWorkspace["response"]
    >({
      target: "offscreen",
      action: "chatGetByWorkspace",
      payload: [workspaceId],
    })
  },

  chatDelete(chatId) {
    return sendMessage<
      ActionChatDelete["message"],
      ActionChatDelete["response"]
    >({
      target: "offscreen",
      action: "chatDelete",
      payload: [chatId],
    })
  },

  chatMessageSend(chatId, message, model, workspaceId, initialSettings) {
    return sendMessage<
      ActionChatMessageSend["message"],
      ActionChatMessageSend["response"]
    >({
      target: "offscreen",
      action: "chatMessageSend",
      payload: [chatId, message, model, workspaceId, initialSettings],
    })
  },

  chatTokenEstimateGet(chatId) {
    return sendMessage<
      ActionChatTokenEstimateGet["message"],
      ActionChatTokenEstimateGet["response"]
    >({
      target: "offscreen",
      action: "chatTokenEstimateGet",
      payload: [chatId],
    })
  },

  chatMessageRunGet(chatId) {
    return sendMessage<
      ActionChatMessageRunGet["message"],
      ActionChatMessageRunGet["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunGet",
      payload: [chatId],
    })
  },

  chatMessageRunRetry(id) {
    return sendMessage<
      ActionChatMessageRunRetry["message"],
      ActionChatMessageRunRetry["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunRetry",
      payload: [id],
    })
  },

  chatMessageRunAnswer(id, answer) {
    return sendMessage<
      ActionChatMessageRunAnswer["message"],
      ActionChatMessageRunAnswer["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunAnswer",
      payload: [id, answer],
    })
  },

  chatMessageRunDelete(id) {
    return sendMessage<
      ActionChatMessageRunDelete["message"],
      ActionChatMessageRunDelete["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunDelete",
      payload: [id],
    })
  },

  chatMessageRunDeleteAfter(id) {
    return sendMessage<
      ActionChatMessageRunDeleteAfter["message"],
      ActionChatMessageRunDeleteAfter["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunDeleteAfter",
      payload: [id],
    })
  },

  chatMessageRunStop(id) {
    return sendMessage<
      ActionChatMessageRunStop["message"],
      ActionChatMessageRunStop["response"]
    >({
      target: "offscreen",
      action: "chatMessageRunStop",
      payload: [id],
    })
  },

  chatSettingsUpdate(chatId, settings) {
    return sendMessage<
      ActionChatSettingsUpdate["message"],
      ActionChatSettingsUpdate["response"]
    >({
      target: "offscreen",
      action: "chatSettingsUpdate",
      payload: [chatId, settings],
    })
  },

  chatTitleUpdate(chatId, title) {
    return sendMessage<
      ActionChatTitleUpdate["message"],
      ActionChatTitleUpdate["response"]
    >({
      target: "offscreen",
      action: "chatTitleUpdate",
      payload: [chatId, title],
    })
  },

  chatTodoListClear(chatId) {
    return sendMessage<
      ActionChatTodoListClear["message"],
      ActionChatTodoListClear["response"]
    >({
      target: "offscreen",
      action: "chatTodoListClear",
      payload: [chatId],
    })
  },

  modelToolGet() {
    return sendMessage<
      ActionModelToolGet["message"],
      ActionModelToolGet["response"]
    >({
      target: "offscreen",
      action: "modelToolGet",
      payload: [],
    })
  },

  mcpServerGet() {
    return sendMessage<
      ActionMcpServerGet["message"],
      ActionMcpServerGet["response"]
    >({
      target: "offscreen",
      action: "mcpServerGet",
      payload: [],
    })
  },

  mcpServerUpdate(servers) {
    return sendMessage<
      ActionMcpServerUpdate["message"],
      ActionMcpServerUpdate["response"]
    >({
      target: "offscreen",
      action: "mcpServerUpdate",
      payload: [servers],
    })
  },

  mcpServerToolsGet(server) {
    return sendMessage<
      ActionMcpServerToolsGet["message"],
      ActionMcpServerToolsGet["response"]
    >({
      target: "offscreen",
      action: "mcpServerToolsGet",
      payload: [server],
    })
  },

  modelProviderTypeGet() {
    return sendMessage<
      ActionModelProviderTypeGet["message"],
      ActionModelProviderTypeGet["response"]
    >({
      target: "offscreen",
      action: "modelProviderTypeGet",
      payload: [],
    })
  },

  modelProviderGet() {
    return sendMessage<
      ActionModelProviderGet["message"],
      ActionModelProviderGet["response"]
    >({
      target: "offscreen",
      action: "modelProviderGet",
      payload: [],
    })
  },

  modelProviderCreate(modelProvider) {
    return sendMessage<
      ActionModelProviderCreate["message"],
      ActionModelProviderCreate["response"]
    >({
      target: "offscreen",
      action: "modelProviderCreate",
      payload: [modelProvider],
    })
  },

  modelProviderUpdate(modelProvider) {
    return sendMessage<
      ActionModelProviderUpdate["message"],
      ActionModelProviderUpdate["response"]
    >({
      target: "offscreen",
      action: "modelProviderUpdate",
      payload: [modelProvider],
    })
  },

  modelProviderDelete(id) {
    return sendMessage<
      ActionModelProviderDelete["message"],
      ActionModelProviderDelete["response"]
    >({
      target: "offscreen",
      action: "modelProviderDelete",
      payload: [id],
    })
  },

  modelProviderModelGet(providerId) {
    return sendMessage<
      ActionModelProviderModelGet["message"],
      ActionModelProviderModelGet["response"]
    >({
      target: "offscreen",
      action: "modelProviderModelGet",
      payload: [providerId],
    })
  },

  modelProviderCheck(provider) {
    return sendMessage<
      ActionModelProviderCheck["message"],
      ActionModelProviderCheck["response"]
    >({
      target: "offscreen",
      action: "modelProviderCheck",
      payload: [provider],
    })
  },

  commandGet() {
    return sendMessage<
      ActionCommandGet["message"],
      ActionCommandGet["response"]
    >({
      target: "offscreen",
      action: "commandGet",
      payload: [],
    })
  },

  commandCreate(command) {
    return sendMessage<
      ActionCommandCreate["message"],
      ActionCommandCreate["response"]
    >({
      target: "offscreen",
      action: "commandCreate",
      payload: [command],
    })
  },

  commandUpdate(command) {
    return sendMessage<
      ActionCommandUpdate["message"],
      ActionCommandUpdate["response"]
    >({
      target: "offscreen",
      action: "commandUpdate",
      payload: [command],
    })
  },

  commandDelete(id) {
    return sendMessage<
      ActionCommandDelete["message"],
      ActionCommandDelete["response"]
    >({
      target: "offscreen",
      action: "commandDelete",
      payload: [id],
    })
  },
}
