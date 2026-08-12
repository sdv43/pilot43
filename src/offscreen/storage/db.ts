import { type IDBPDatabase, openDB } from "idb"

import type {
  AppSettings,
  Chat,
  Command,
  MessageRun,
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
  Workspace,
} from "@/shared/api"

const DB_NAME = "pilot43"
const DB_VERSION = 3

export const APP_SETTINGS_KEY = "app"

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
  commands: {
    key: string
    value: Command
  }
}

let dbInstance: IDBPDatabase<Pilot43DB> | null = null

export async function getDB(): Promise<IDBPDatabase<Pilot43DB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<Pilot43DB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
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
    },
  })

  return dbInstance
}
