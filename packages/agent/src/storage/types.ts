import type {
  AppSettings,
  Chat,
  GeneratedFile,
  MessageRun,
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
  Prompt,
  Workspace,
} from "@pilot43/protocol"

export type ModelProvider =
  OllamaModelProvider | OpenAIModelProvider | OpenRouterModelProvider

export interface EntityCollection<T extends { id: string }> {
  getAll: () => Promise<T[]>
  getById: (id: T["id"]) => Promise<T | undefined>
  /** Inserts or replaces the entity with the same id. */
  put: (entity: T) => Promise<void>
  delete: (id: T["id"]) => Promise<void>
}

/**
 * Persistence used by the agent. Platforms implement it on top of their
 * storage (e.g. IndexedDB in the browser). Implementations only persist and
 * query records; ids, defaults and other domain rules are applied by the
 * agent.
 */
export interface AgentStorage {
  /** The single app settings record. */
  appSettings: {
    get: () => Promise<AppSettings | undefined>
    put: (settings: AppSettings) => Promise<void>
  }
  chats: {
    getById: (id: Chat["id"]) => Promise<Chat | undefined>
    getByWorkspace: (workspaceId: Workspace["id"]) => Promise<Chat[]>
    put: (chat: Chat) => Promise<void>
    delete: (id: Chat["id"]) => Promise<void>
  }
  generatedFiles: {
    getById: (id: GeneratedFile["id"]) => Promise<GeneratedFile | undefined>
    put: (file: GeneratedFile) => Promise<void>
    /**
     * Atomically replaces a file with the result of `update`, which receives
     * the current record (`undefined` when missing). When `update` throws,
     * nothing is written and the error is rethrown. `update` must be
     * synchronous so it runs inside the storage transaction.
     */
    update: (
      id: GeneratedFile["id"],
      update: (file: GeneratedFile | undefined) => GeneratedFile,
    ) => Promise<GeneratedFile>
    deleteByChat: (chatId: Chat["id"]) => Promise<void>
  }
  messageRuns: {
    getById: (id: MessageRun["id"]) => Promise<MessageRun | undefined>
    /** Runs of the chat in any order. */
    getByChat: (chatId: Chat["id"]) => Promise<MessageRun[]>
    put: (messageRun: MessageRun) => Promise<void>
    delete: (id: MessageRun["id"]) => Promise<void>
    /** Deletes all the runs in a single transaction. */
    deleteMany: (ids: MessageRun["id"][]) => Promise<void>
  }
  modelProviders: EntityCollection<ModelProvider>
  prompts: EntityCollection<Prompt>
  workspaces: EntityCollection<Workspace>
}
