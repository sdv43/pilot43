import type { Chat, GeneratedFile } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createGeneratedFileStore(storage: AgentStorage) {
  return {
    createGeneratedFile: async (
      file: GeneratedFile,
    ): Promise<GeneratedFile> => {
      await storage.generatedFiles.put(file)
      return file
    },

    /**
     * Appends a text chunk to an existing generated file atomically so
     * concurrent tool calls can never interleave a stale read with a newer
     * write.
     */
    appendToGeneratedFile: (
      id: GeneratedFile["id"],
      chunk: string,
      limits: { chatId?: Chat["id"]; maxSize?: number } = {},
    ): Promise<GeneratedFile> => {
      return storage.generatedFiles.update(id, (existing) => {
        // Files of other chats are reported as missing so their ids can't be
        // probed.
        if (
          !existing ||
          (limits.chatId !== undefined && existing.chatId !== limits.chatId)
        ) {
          throw new Error(`Generated file \`${id}\` not found.`)
        }

        if (
          limits.maxSize !== undefined &&
          existing.content.length + chunk.length > limits.maxSize
        ) {
          throw new Error(
            `The file would exceed ${limits.maxSize} characters in total. Finish the file where it is.`,
          )
        }

        return {
          ...existing,
          content: existing.content + chunk,
          size: existing.content.length + chunk.length,
          updatedAt: Date.now(),
        }
      })
    },

    getGeneratedFile: (
      id: GeneratedFile["id"],
    ): Promise<GeneratedFile | undefined> => {
      return storage.generatedFiles.getById(id)
    },

    deleteGeneratedFilesByChat: async (chatId: Chat["id"]): Promise<void> => {
      await storage.generatedFiles.deleteByChat(chatId)
    },
  }
}
