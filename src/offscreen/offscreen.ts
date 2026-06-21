import { addMessageListener } from "@/shared/chrome"

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

import {
  handleAppSettingsGet,
  handleAppSettingsUpdate,
  handleChatDelete,
  handleChatGetByWorkspace,
  handleChatMessageRunAnswer,
  handleChatMessageRunDelete,
  handleChatMessageRunDeleteAfter,
  handleChatMessageRunGet,
  handleChatMessageRunRetry,
  handleChatMessageRunStop,
  handleChatMessageSend,
  handleChatSettingsUpdate,
  handleChatTodoListClear,
  handleChatTokenEstimateGet,
  handleCommandCreate,
  handleCommandDelete,
  handleCommandGet,
  handleCommandUpdate,
  handleMcpServerGet,
  handleMcpServerToolsGet,
  handleMcpServerUpdate,
  handleModelProviderCheck,
  handleModelProviderCreate,
  handleModelProviderDelete,
  handleModelProviderGet,
  handleModelProviderModelGet,
  handleModelProviderTypeGet,
  handleModelProviderUpdate,
  handleModelToolGet,
  handleWorkspaceCreate,
  handleWorkspaceDelete,
  handleWorkspaceGet,
  handleWorkspaceUpdate,
} from "./handlers"

console.debug("Offscreen document loaded")

// App settings handlers
addMessageListener<
  ActionAppSettingsGet["message"],
  ActionAppSettingsGet["response"]
>("offscreen", "appSettingsGet", async () => {
  const result = await handleAppSettingsGet()
  return { result }
})

addMessageListener<
  ActionAppSettingsUpdate["message"],
  ActionAppSettingsUpdate["response"]
>("offscreen", "appSettingsUpdate", async ({ payload }) => {
  const result = await handleAppSettingsUpdate(payload[0])
  return { result }
})

// Workspace handlers
addMessageListener<
  ActionWorkspaceGet["message"],
  ActionWorkspaceGet["response"]
>("offscreen", "workspaceGet", async () => {
  const result = await handleWorkspaceGet()
  return { result }
})

addMessageListener<
  ActionWorkspaceCreate["message"],
  ActionWorkspaceCreate["response"]
>("offscreen", "workspaceCreate", async ({ payload }) => {
  const result = await handleWorkspaceCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionWorkspaceUpdate["message"],
  ActionWorkspaceUpdate["response"]
>("offscreen", "workspaceUpdate", async ({ payload }) => {
  const result = await handleWorkspaceUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionWorkspaceDelete["message"],
  ActionWorkspaceDelete["response"]
>("offscreen", "workspaceDelete", async ({ payload }) => {
  const result = await handleWorkspaceDelete(payload[0])
  return { result }
})

// Chat handlers
addMessageListener<
  ActionChatGetByWorkspace["message"],
  ActionChatGetByWorkspace["response"]
>("offscreen", "chatGetByWorkspace", async ({ payload }) => {
  const result = await handleChatGetByWorkspace(payload[0])
  return { result }
})

addMessageListener<ActionChatDelete["message"], ActionChatDelete["response"]>(
  "offscreen",
  "chatDelete",
  async ({ payload }) => {
    const result = await handleChatDelete(payload[0])
    return { result }
  },
)

addMessageListener<
  ActionChatMessageSend["message"],
  ActionChatMessageSend["response"]
>("offscreen", "chatMessageSend", async ({ payload }) => {
  const result = await handleChatMessageSend(...payload)
  return { result }
})

addMessageListener<
  ActionChatTokenEstimateGet["message"],
  ActionChatTokenEstimateGet["response"]
>("offscreen", "chatTokenEstimateGet", async ({ payload }) => {
  const result = await handleChatTokenEstimateGet(payload[0])
  return { result }
})

addMessageListener<
  ActionChatSettingsUpdate["message"],
  ActionChatSettingsUpdate["response"]
>("offscreen", "chatSettingsUpdate", async ({ payload }) => {
  const result = await handleChatSettingsUpdate(...payload)
  return { result }
})

addMessageListener<
  ActionChatTodoListClear["message"],
  ActionChatTodoListClear["response"]
>("offscreen", "chatTodoListClear", async ({ payload }) => {
  const result = await handleChatTodoListClear(payload[0])
  return { result }
})

// Message run handlers
addMessageListener<
  ActionChatMessageRunGet["message"],
  ActionChatMessageRunGet["response"]
>("offscreen", "chatMessageRunGet", async ({ payload }) => {
  const result = await handleChatMessageRunGet(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunRetry["message"],
  ActionChatMessageRunRetry["response"]
>("offscreen", "chatMessageRunRetry", async ({ payload }) => {
  const result = await handleChatMessageRunRetry(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunDelete["message"],
  ActionChatMessageRunDelete["response"]
>("offscreen", "chatMessageRunDelete", async ({ payload }) => {
  const result = await handleChatMessageRunDelete(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunDeleteAfter["message"],
  ActionChatMessageRunDeleteAfter["response"]
>("offscreen", "chatMessageRunDeleteAfter", async ({ payload }) => {
  const result = await handleChatMessageRunDeleteAfter(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunStop["message"],
  ActionChatMessageRunStop["response"]
>("offscreen", "chatMessageRunStop", async ({ payload }) => {
  const result = await handleChatMessageRunStop(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunAnswer["message"],
  ActionChatMessageRunAnswer["response"]
>("offscreen", "chatMessageRunAnswer", async ({ payload }) => {
  const result = await handleChatMessageRunAnswer(...payload)
  return { result }
})

// Model tool handlers
addMessageListener<
  ActionModelToolGet["message"],
  ActionModelToolGet["response"]
>("offscreen", "modelToolGet", async () => {
  const result = await handleModelToolGet()
  return { result }
})

// MCP server handlers
addMessageListener<
  ActionMcpServerGet["message"],
  ActionMcpServerGet["response"]
>("offscreen", "mcpServerGet", async () => {
  const result = await handleMcpServerGet()
  return { result }
})

addMessageListener<
  ActionMcpServerUpdate["message"],
  ActionMcpServerUpdate["response"]
>("offscreen", "mcpServerUpdate", async ({ payload }) => {
  const result = await handleMcpServerUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionMcpServerToolsGet["message"],
  ActionMcpServerToolsGet["response"]
>("offscreen", "mcpServerToolsGet", async ({ payload }) => {
  const result = await handleMcpServerToolsGet(payload[0])
  return { result }
})

// Model provider handlers
addMessageListener<
  ActionModelProviderTypeGet["message"],
  ActionModelProviderTypeGet["response"]
>("offscreen", "modelProviderTypeGet", async () => {
  const result = await handleModelProviderTypeGet()
  return { result }
})

addMessageListener<
  ActionModelProviderGet["message"],
  ActionModelProviderGet["response"]
>("offscreen", "modelProviderGet", async () => {
  const result = await handleModelProviderGet()
  return { result }
})

addMessageListener<
  ActionModelProviderCreate["message"],
  ActionModelProviderCreate["response"]
>("offscreen", "modelProviderCreate", async ({ payload }) => {
  const result = await handleModelProviderCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderUpdate["message"],
  ActionModelProviderUpdate["response"]
>("offscreen", "modelProviderUpdate", async ({ payload }) => {
  const result = await handleModelProviderUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderDelete["message"],
  ActionModelProviderDelete["response"]
>("offscreen", "modelProviderDelete", async ({ payload }) => {
  const result = await handleModelProviderDelete(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderModelGet["message"],
  ActionModelProviderModelGet["response"]
>("offscreen", "modelProviderModelGet", async ({ payload }) => {
  const result = await handleModelProviderModelGet(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderCheck["message"],
  ActionModelProviderCheck["response"]
>("offscreen", "modelProviderCheck", async ({ payload }) => {
  const result = await handleModelProviderCheck(payload[0])
  return { result }
})

// Command handlers
addMessageListener<ActionCommandGet["message"], ActionCommandGet["response"]>(
  "offscreen",
  "commandGet",
  async () => {
    const result = await handleCommandGet()
    return { result }
  },
)

addMessageListener<
  ActionCommandCreate["message"],
  ActionCommandCreate["response"]
>("offscreen", "commandCreate", async ({ payload }) => {
  const result = await handleCommandCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionCommandUpdate["message"],
  ActionCommandUpdate["response"]
>("offscreen", "commandUpdate", async ({ payload }) => {
  const result = await handleCommandUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionCommandDelete["message"],
  ActionCommandDelete["response"]
>("offscreen", "commandDelete", async ({ payload }) => {
  await handleCommandDelete(payload[0])
  return { result: undefined }
})
