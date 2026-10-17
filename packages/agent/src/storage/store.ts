import type { AgentStorage } from "./types"

import { createAppSettingsStore } from "./app-settings-store"
import { createChatStore } from "./chat-store"
import { createGeneratedFileStore } from "./generated-file-store"
import { createMessageRunStore } from "./message-run-store"
import { createModelProviderStore } from "./model-provider-store"
import { createPromptStore } from "./prompt-store"
import { createWorkspaceStore } from "./workspace-store"

/**
 * Domain-level data access of the agent: applies ids, defaults, migrations and
 * other rules on top of the platform's {@link AgentStorage}.
 */
export type AgentStore = ReturnType<typeof createAgentStore>

export function createAgentStore(storage: AgentStorage) {
  return {
    ...createAppSettingsStore(storage),
    ...createChatStore(storage),
    ...createGeneratedFileStore(storage),
    ...createMessageRunStore(storage),
    ...createModelProviderStore(storage),
    ...createPromptStore(storage),
    ...createWorkspaceStore(storage),
  }
}
