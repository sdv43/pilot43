import type { BackendApi } from "@pilot43/protocol"

import type { AgentContext, AgentNotifier } from "./context"
import type { AgentStorage } from "./storage"
import type { Toolset } from "./tools/types"

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
  handleChatTitleUpdate,
  handleChatTodoListClear,
  handleChatTokenEstimateGet,
  handleDataDeleteAll,
  handleGeneratedFileGet,
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
  handlePromptCreate,
  handlePromptDelete,
  handlePromptGet,
  handlePromptUpdate,
  handleWorkspaceCreate,
  handleWorkspaceDelete,
  handleWorkspaceGet,
  handleWorkspaceUpdate,
} from "./handlers"
import {
  deleteExpiredChats,
  recoverInterruptedRuns,
} from "./handlers/data-handlers"
import { createAgentStore } from "./storage"

export interface AgentOptions {
  notifier: AgentNotifier
  storage: AgentStorage
  /** System message that opens every conversation sent to the model. */
  systemPrompt: () => string
  toolset: Toolset
}

export interface Agent {
  api: BackendApi
  /**
   * Deletes chats older than the retention period in the app settings.
   * Platforms call it periodically; it also runs when the setting changes.
   */
  deleteExpiredChats: () => Promise<number>
  /**
   * Marks runs left generating by a previous agent instance as stopped.
   * Platforms call it once at startup.
   */
  recoverInterruptedRuns: () => Promise<number>
}

/**
 * Creates the agent backend from the platform's dependencies. The returned
 * `api` serves the {@link BackendApi} for the platform's clients.
 */
export function createAgent({
  notifier,
  storage,
  systemPrompt,
  toolset,
}: AgentOptions): Agent {
  const ctx: AgentContext = {
    notifier,
    store: createAgentStore(storage),
    systemPrompt,
    toolset,
  }

  return {
    api: {
      appSettingsGet: () => handleAppSettingsGet(ctx),
      appSettingsUpdate: async (...args) => {
        const settings = await handleAppSettingsUpdate(ctx, ...args)
        await deleteExpiredChats(ctx)
        return settings
      },

      workspaceGet: () => handleWorkspaceGet(ctx),
      workspaceCreate: (...args) => handleWorkspaceCreate(ctx, ...args),
      workspaceUpdate: (...args) => handleWorkspaceUpdate(ctx, ...args),
      workspaceDelete: (...args) => handleWorkspaceDelete(ctx, ...args),

      chatGetByWorkspace: (...args) => handleChatGetByWorkspace(ctx, ...args),
      chatDelete: (...args) => handleChatDelete(ctx, ...args),
      chatMessageSend: (...args) => handleChatMessageSend(ctx, ...args),
      chatTokenEstimateGet: (...args) =>
        handleChatTokenEstimateGet(ctx, ...args),
      chatMessageRunGet: (...args) => handleChatMessageRunGet(ctx, ...args),
      chatMessageRunRetry: (...args) => handleChatMessageRunRetry(ctx, ...args),
      chatMessageRunStop: (...args) => handleChatMessageRunStop(ctx, ...args),
      chatMessageRunDelete: (...args) =>
        handleChatMessageRunDelete(ctx, ...args),
      chatMessageRunDeleteAfter: (...args) =>
        handleChatMessageRunDeleteAfter(ctx, ...args),
      chatMessageRunAnswer: (...args) =>
        handleChatMessageRunAnswer(ctx, ...args),
      chatSettingsUpdate: (...args) => handleChatSettingsUpdate(ctx, ...args),
      chatTitleUpdate: (...args) => handleChatTitleUpdate(ctx, ...args),
      generatedFileGet: (...args) => handleGeneratedFileGet(ctx, ...args),
      chatTodoListClear: (...args) => handleChatTodoListClear(ctx, ...args),

      modelProviderTypeGet: () => handleModelProviderTypeGet(),
      modelProviderGet: () => handleModelProviderGet(ctx),
      modelProviderCreate: (...args) => handleModelProviderCreate(ctx, ...args),
      modelProviderUpdate: (...args) => handleModelProviderUpdate(ctx, ...args),
      modelProviderDelete: (...args) => handleModelProviderDelete(ctx, ...args),
      modelProviderModelGet: (...args) =>
        handleModelProviderModelGet(ctx, ...args),
      modelProviderCheck: (...args) => handleModelProviderCheck(...args),

      modelToolGet: () => handleModelToolGet(ctx),

      mcpServerGet: () => handleMcpServerGet(ctx),
      mcpServerUpdate: (...args) => handleMcpServerUpdate(ctx, ...args),
      mcpServerToolsGet: (...args) => handleMcpServerToolsGet(...args),

      promptGet: () => handlePromptGet(ctx),
      promptCreate: (...args) => handlePromptCreate(ctx, ...args),
      promptUpdate: (...args) => handlePromptUpdate(ctx, ...args),
      promptDelete: (...args) => handlePromptDelete(ctx, ...args),

      dataDeleteAll: () => handleDataDeleteAll(ctx),
    },
    deleteExpiredChats: () => deleteExpiredChats(ctx),
    recoverInterruptedRuns: () => recoverInterruptedRuns(ctx),
  }
}
