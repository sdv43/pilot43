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

import { type IDBPDatabase, openDB } from "idb"

import { type LegacyCommand, migrateCommandToPrompt } from "./migrations"

const DB_NAME = "pilot43"
const DB_VERSION = 5

export interface Pilot43DB {
  workspaces: {
    key: string
    value: Workspace
  }
  chats: {
    key: string
    value: Chat
  }
  messageRuns: {
    key: string
    value: MessageRun
    indexes: { chatId: string }
  }
  modelProviders: {
    key: string
    value: OllamaModelProvider | OpenAIModelProvider | OpenRouterModelProvider
  }
  appSettings: {
    key: string
    value: AppSettings
  }
  /** Slash commands of v3–v4; migrated to `prompts` and removed in v5. */
  commands: {
    key: string
    value: LegacyCommand
  }
  prompts: {
    key: string
    value: Prompt
  }
  generatedFiles: {
    key: string
    value: GeneratedFile
    indexes: { chatId: string }
  }
}

let dbInstance: IDBPDatabase<Pilot43DB> | null = null

export async function getDB(): Promise<IDBPDatabase<Pilot43DB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<Pilot43DB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Create workspaces store
      if (!db.objectStoreNames.contains("workspaces")) {
        db.createObjectStore("workspaces", { keyPath: "id" })
      }

      // Create chats store
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id" })
      }

      // Create messageRuns store with chatId index
      if (!db.objectStoreNames.contains("messageRuns")) {
        const messageRunsStore = db.createObjectStore("messageRuns", {
          keyPath: "id",
        })
        messageRunsStore.createIndex("chatId", "chatId", { unique: false })
      }

      // Create modelProviders store
      if (!db.objectStoreNames.contains("modelProviders")) {
        db.createObjectStore("modelProviders", { keyPath: "id" })
      }

      // Create appSettings store (v2)
      if (!db.objectStoreNames.contains("appSettings")) {
        db.createObjectStore("appSettings", { keyPath: "id" })
      }

      // Create commands store (v3)
      if (oldVersion < 3 && !db.objectStoreNames.contains("commands")) {
        db.createObjectStore("commands", { keyPath: "id" })
      }

      // Create generatedFiles store with chatId index (v4)
      if (oldVersion < 4 && !db.objectStoreNames.contains("generatedFiles")) {
        const generatedFilesStore = db.createObjectStore("generatedFiles", {
          keyPath: "id",
        })
        generatedFilesStore.createIndex("chatId", "chatId", { unique: false })
      }

      // Replace slash commands with prompts (v5)
      if (oldVersion < 5) {
        const promptsStore = db.createObjectStore("prompts", { keyPath: "id" })

        if (db.objectStoreNames.contains("commands")) {
          // Only IndexedDB requests are awaited, so the upgrade transaction
          // stays active until the commands are copied and their store is
          // dropped.
          void transaction
            .objectStore("commands")
            .getAll()
            .then(async (commands: LegacyCommand[]) => {
              for (const command of commands) {
                await promptsStore.put(migrateCommandToPrompt(command))
              }

              db.deleteObjectStore("commands")
            })
        }
      }
    },
  })

  return dbInstance
}
