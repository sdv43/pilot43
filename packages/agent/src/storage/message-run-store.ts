import type { Chat, MessageRun } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createMessageRunStore(storage: AgentStorage) {
  async function getMessageRunsByChat(
    chatId: Chat["id"],
  ): Promise<MessageRun[]> {
    return (await storage.messageRuns.getByChat(chatId)).sort(
      (a, b) => a.createdAt - b.createdAt,
    )
  }

  async function saveMessageRun(messageRun: MessageRun): Promise<MessageRun> {
    await storage.messageRuns.put(messageRun)
    return messageRun
  }

  return {
    getMessageRunsByChat,

    getMessageRunById: (
      id: MessageRun["id"],
    ): Promise<MessageRun | undefined> => {
      return storage.messageRuns.getById(id)
    },

    createMessageRun: saveMessageRun,
    updateMessageRun: saveMessageRun,

    deleteMessageRun: async (id: MessageRun["id"]): Promise<void> => {
      await storage.messageRuns.delete(id)
    },

    deleteMessageRunsByChat: async (chatId: Chat["id"]): Promise<void> => {
      const messageRuns = await getMessageRunsByChat(chatId)
      await storage.messageRuns.deleteMany(messageRuns.map((run) => run.id))
    },

    /**
     * Deletes every message run created strictly after the run identified by
     * `messageRunId` within the same chat. Returns the deleted runs so callers
     * can abort any in-progress generations and notify the clients.
     */
    deleteMessageRunsAfter: async (
      messageRunId: MessageRun["id"],
    ): Promise<MessageRun[]> => {
      const target = await storage.messageRuns.getById(messageRunId)
      if (!target) {
        return []
      }

      const runs = (await getMessageRunsByChat(target.chatId)).filter(
        (run) => run.createdAt > target.createdAt,
      )

      if (runs.length === 0) {
        return []
      }

      await storage.messageRuns.deleteMany(runs.map((run) => run.id))

      return runs
    },
  }
}
