import type { AgentStorage } from "@pilot43/agent"
import type { GeneratedFile, MessageRun } from "@pilot43/protocol"

import { APP_SETTINGS_KEY } from "@pilot43/agent"

import { getDB, type Pilot43DB } from "./db"

type CollectionName = Exclude<keyof Pilot43DB, "appSettings">

function createCollection<N extends CollectionName>(name: N) {
  return {
    getAll: async () =>
      (await (await getDB()).getAll(name)) as Pilot43DB[N]["value"][],
    getById: async (id: string) =>
      (await (await getDB()).get(name, id)) as
        Pilot43DB[N]["value"] | undefined,
    put: async (entity: Pilot43DB[N]["value"]) => {
      await (await getDB()).put(name, entity)
    },
    delete: async (id: string) => {
      await (await getDB()).delete(name, id)
    },
  }
}

/**
 * {@link AgentStorage} backed by the extension's IndexedDB database.
 */
export function createIdbStorage(): AgentStorage {
  const chats = createCollection("chats")
  const generatedFiles = createCollection("generatedFiles")
  const messageRuns = createCollection("messageRuns")

  return {
    appSettings: {
      get: async () =>
        (await (await getDB()).get("appSettings", APP_SETTINGS_KEY)) as
          Pilot43DB["appSettings"]["value"] | undefined,
      put: async (settings) => {
        await (await getDB()).put("appSettings", settings)
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
    commands: createCollection("commands"),
    generatedFiles: {
      getById: generatedFiles.getById,
      put: generatedFiles.put,
      update: async (id, update) => {
        const db = await getDB()
        const tx = db.transaction("generatedFiles", "readwrite")

        try {
          const updated = update(
            (await tx.store.get(id)) as GeneratedFile | undefined,
          )

          await tx.store.put(updated)
          await tx.done

          return updated
        } catch (error) {
          try {
            await tx.done
          } catch {
            // The transaction already failed; rethrow the original error.
          }
          throw error
        }
      },
      deleteByChat: async (chatId) => {
        const db = await getDB()
        const tx = db.transaction("generatedFiles", "readwrite")
        const ids = await tx.store.index("chatId").getAllKeys(chatId)

        for (const id of ids) {
          await tx.store.delete(id)
        }

        await tx.done
      },
    },
    messageRuns: {
      getById: messageRuns.getById,
      getByChat: async (chatId) => {
        const db = await getDB()
        const index = db.transaction("messageRuns").store.index("chatId")
        return (await index.getAll(chatId)) as MessageRun[]
      },
      put: messageRuns.put,
      delete: messageRuns.delete,
      deleteMany: async (ids) => {
        const db = await getDB()
        const tx = db.transaction("messageRuns", "readwrite")
        await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
      },
    },
    modelProviders: createCollection("modelProviders"),
    workspaces: createCollection("workspaces"),
  }
}
