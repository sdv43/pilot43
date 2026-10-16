import { createAgent } from "@pilot43/agent"
import { createIdbStorage } from "@pilot43/agent-browser"

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
  ActionChatTitleUpdate,
  ActionChatTodoListClear,
  ActionChatTokenEstimateGet,
  ActionCommandCreate,
  ActionCommandDelete,
  ActionCommandGet,
  ActionCommandUpdate,
  ActionGeneratedFileGet,
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

import { chromeNotifier } from "./chrome-notifier"
import { extensionSystemMessage } from "./system-prompt"
import { toolset } from "./toolset"

console.debug("Offscreen document loaded")

const agent = createAgent({
  notifier: chromeNotifier,
  storage: createIdbStorage(),
  systemPrompt: extensionSystemMessage,
  toolset,
})

// App settings handlers
addMessageListener<
  ActionAppSettingsGet["message"],
  ActionAppSettingsGet["response"]
>("offscreen", "appSettingsGet", async () => {
  const result = await agent.api.appSettingsGet()
  return { result }
})

addMessageListener<
  ActionAppSettingsUpdate["message"],
  ActionAppSettingsUpdate["response"]
>("offscreen", "appSettingsUpdate", async ({ payload }) => {
  const result = await agent.api.appSettingsUpdate(payload[0])
  return { result }
})

// Workspace handlers
addMessageListener<
  ActionWorkspaceGet["message"],
  ActionWorkspaceGet["response"]
>("offscreen", "workspaceGet", async () => {
  const result = await agent.api.workspaceGet()
  return { result }
})

addMessageListener<
  ActionWorkspaceCreate["message"],
  ActionWorkspaceCreate["response"]
>("offscreen", "workspaceCreate", async ({ payload }) => {
  const result = await agent.api.workspaceCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionWorkspaceUpdate["message"],
  ActionWorkspaceUpdate["response"]
>("offscreen", "workspaceUpdate", async ({ payload }) => {
  const result = await agent.api.workspaceUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionWorkspaceDelete["message"],
  ActionWorkspaceDelete["response"]
>("offscreen", "workspaceDelete", async ({ payload }) => {
  const result = await agent.api.workspaceDelete(payload[0])
  return { result }
})

// Chat handlers
addMessageListener<
  ActionChatGetByWorkspace["message"],
  ActionChatGetByWorkspace["response"]
>("offscreen", "chatGetByWorkspace", async ({ payload }) => {
  const result = await agent.api.chatGetByWorkspace(payload[0])
  return { result }
})

addMessageListener<ActionChatDelete["message"], ActionChatDelete["response"]>(
  "offscreen",
  "chatDelete",
  async ({ payload }) => {
    const result = await agent.api.chatDelete(payload[0])
    return { result }
  },
)

addMessageListener<
  ActionChatMessageSend["message"],
  ActionChatMessageSend["response"]
>("offscreen", "chatMessageSend", async ({ payload }) => {
  const result = await agent.api.chatMessageSend(...payload)
  return { result }
})

addMessageListener<
  ActionChatTokenEstimateGet["message"],
  ActionChatTokenEstimateGet["response"]
>("offscreen", "chatTokenEstimateGet", async ({ payload }) => {
  const result = await agent.api.chatTokenEstimateGet(payload[0])
  return { result }
})

addMessageListener<
  ActionChatSettingsUpdate["message"],
  ActionChatSettingsUpdate["response"]
>("offscreen", "chatSettingsUpdate", async ({ payload }) => {
  const result = await agent.api.chatSettingsUpdate(...payload)
  return { result }
})

addMessageListener<
  ActionChatTitleUpdate["message"],
  ActionChatTitleUpdate["response"]
>("offscreen", "chatTitleUpdate", async ({ payload }) => {
  const result = await agent.api.chatTitleUpdate(payload[0], payload[1])
  return { result }
})

addMessageListener<
  ActionChatTodoListClear["message"],
  ActionChatTodoListClear["response"]
>("offscreen", "chatTodoListClear", async ({ payload }) => {
  const result = await agent.api.chatTodoListClear(payload[0])
  return { result }
})

// Message run handlers
addMessageListener<
  ActionChatMessageRunGet["message"],
  ActionChatMessageRunGet["response"]
>("offscreen", "chatMessageRunGet", async ({ payload }) => {
  const result = await agent.api.chatMessageRunGet(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunRetry["message"],
  ActionChatMessageRunRetry["response"]
>("offscreen", "chatMessageRunRetry", async ({ payload }) => {
  const result = await agent.api.chatMessageRunRetry(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunDelete["message"],
  ActionChatMessageRunDelete["response"]
>("offscreen", "chatMessageRunDelete", async ({ payload }) => {
  const result = await agent.api.chatMessageRunDelete(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunDeleteAfter["message"],
  ActionChatMessageRunDeleteAfter["response"]
>("offscreen", "chatMessageRunDeleteAfter", async ({ payload }) => {
  const result = await agent.api.chatMessageRunDeleteAfter(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunStop["message"],
  ActionChatMessageRunStop["response"]
>("offscreen", "chatMessageRunStop", async ({ payload }) => {
  const result = await agent.api.chatMessageRunStop(payload[0])
  return { result }
})

addMessageListener<
  ActionChatMessageRunAnswer["message"],
  ActionChatMessageRunAnswer["response"]
>("offscreen", "chatMessageRunAnswer", async ({ payload }) => {
  const result = await agent.api.chatMessageRunAnswer(...payload)
  return { result }
})

// Model tool handlers
addMessageListener<
  ActionModelToolGet["message"],
  ActionModelToolGet["response"]
>("offscreen", "modelToolGet", async () => {
  const result = await agent.api.modelToolGet()
  return { result }
})

// MCP server handlers
addMessageListener<
  ActionMcpServerGet["message"],
  ActionMcpServerGet["response"]
>("offscreen", "mcpServerGet", async () => {
  const result = await agent.api.mcpServerGet()
  return { result }
})

addMessageListener<
  ActionMcpServerUpdate["message"],
  ActionMcpServerUpdate["response"]
>("offscreen", "mcpServerUpdate", async ({ payload }) => {
  const result = await agent.api.mcpServerUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionMcpServerToolsGet["message"],
  ActionMcpServerToolsGet["response"]
>("offscreen", "mcpServerToolsGet", async ({ payload }) => {
  const result = await agent.api.mcpServerToolsGet(payload[0])
  return { result }
})

// Model provider handlers
addMessageListener<
  ActionModelProviderTypeGet["message"],
  ActionModelProviderTypeGet["response"]
>("offscreen", "modelProviderTypeGet", async () => {
  const result = await agent.api.modelProviderTypeGet()
  return { result }
})

addMessageListener<
  ActionModelProviderGet["message"],
  ActionModelProviderGet["response"]
>("offscreen", "modelProviderGet", async () => {
  const result = await agent.api.modelProviderGet()
  return { result }
})

addMessageListener<
  ActionModelProviderCreate["message"],
  ActionModelProviderCreate["response"]
>("offscreen", "modelProviderCreate", async ({ payload }) => {
  const result = await agent.api.modelProviderCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderUpdate["message"],
  ActionModelProviderUpdate["response"]
>("offscreen", "modelProviderUpdate", async ({ payload }) => {
  const result = await agent.api.modelProviderUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderDelete["message"],
  ActionModelProviderDelete["response"]
>("offscreen", "modelProviderDelete", async ({ payload }) => {
  const result = await agent.api.modelProviderDelete(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderModelGet["message"],
  ActionModelProviderModelGet["response"]
>("offscreen", "modelProviderModelGet", async ({ payload }) => {
  const result = await agent.api.modelProviderModelGet(payload[0])
  return { result }
})

addMessageListener<
  ActionModelProviderCheck["message"],
  ActionModelProviderCheck["response"]
>("offscreen", "modelProviderCheck", async ({ payload }) => {
  const result = await agent.api.modelProviderCheck(payload[0])
  return { result }
})

// Command handlers
addMessageListener<ActionCommandGet["message"], ActionCommandGet["response"]>(
  "offscreen",
  "commandGet",
  async () => {
    const result = await agent.api.commandGet()
    return { result }
  },
)

addMessageListener<
  ActionCommandCreate["message"],
  ActionCommandCreate["response"]
>("offscreen", "commandCreate", async ({ payload }) => {
  const result = await agent.api.commandCreate(payload[0])
  return { result }
})

addMessageListener<
  ActionCommandUpdate["message"],
  ActionCommandUpdate["response"]
>("offscreen", "commandUpdate", async ({ payload }) => {
  const result = await agent.api.commandUpdate(payload[0])
  return { result }
})

addMessageListener<
  ActionCommandDelete["message"],
  ActionCommandDelete["response"]
>("offscreen", "commandDelete", async ({ payload }) => {
  await agent.api.commandDelete(payload[0])
  return { result: undefined }
})

addMessageListener<
  ActionGeneratedFileGet["message"],
  ActionGeneratedFileGet["response"]
>("offscreen", "generatedFileGet", async ({ payload }) => {
  const result = await agent.api.generatedFileGet(payload[0])
  return { result }
})
