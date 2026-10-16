import type {
  AppSettings,
  Chat,
  GeneratedFile,
  MessageRun,
} from "@pilot43/protocol"

import type { AgentStorage, EntityCollection } from "./types"

function createMemoryCollection<
  T extends { id: string },
>(): EntityCollection<T> & {
  records: Map<string, T>
} {
  const records = new Map<string, T>()

  return {
    records,
    getAll: () => Promise.resolve([...records.values()].map(clone)),
    getById: (id) => Promise.resolve(cloneOptional(records.get(id))),
    put: (entity) => {
      records.set(entity.id, clone(entity))
      return Promise.resolve()
    },
    delete: (id) => {
      records.delete(id)
      return Promise.resolve()
    },
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function cloneOptional<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : clone(value)
}

/**
 * {@link AgentStorage} that keeps records in memory. Records are cloned on
 * read and write, like a real database. Useful for tests and as a reference
 * implementation of the storage contract.
 */
export function createMemoryStorage(): AgentStorage {
  let appSettings: AppSettings | undefined
  const chats = createMemoryCollection<Chat>()
  const generatedFiles = createMemoryCollection<GeneratedFile>()
  const messageRuns = createMemoryCollection<MessageRun>()

  return {
    appSettings: {
      get: () => Promise.resolve(cloneOptional(appSettings)),
      put: (settings) => {
        appSettings = clone(settings)
        return Promise.resolve()
      },
    },
    chats: {
      getById: chats.getById,
      getByWorkspace: async (workspaceId) =>
        (await chats.getAll()).filter(
          (chat) => chat.workspaceId === workspaceId,
        ),
      put: chats.put,
      delete: chats.delete,
    },
    commands: createMemoryCollection(),
    generatedFiles: {
      getById: generatedFiles.getById,
      put: generatedFiles.put,
      update: (id, update) =>
        // Errors thrown by `update` reject the promise; nothing is written.
        new Promise((resolve) => {
          const updated = update(cloneOptional(generatedFiles.records.get(id)))
          generatedFiles.records.set(id, clone(updated))
          resolve(clone(updated))
        }),
      deleteByChat: (chatId) => {
        for (const [id, file] of generatedFiles.records) {
          if (file.chatId === chatId) {
            generatedFiles.records.delete(id)
          }
        }
        return Promise.resolve()
      },
    },
    messageRuns: {
      getById: messageRuns.getById,
      getByChat: async (chatId) =>
        (await messageRuns.getAll()).filter((run) => run.chatId === chatId),
      put: messageRuns.put,
      delete: messageRuns.delete,
      deleteMany: (ids) => {
        for (const id of ids) {
          messageRuns.records.delete(id)
        }
        return Promise.resolve()
      },
    },
    modelProviders: createMemoryCollection(),
    workspaces: createMemoryCollection(),
  }
}
