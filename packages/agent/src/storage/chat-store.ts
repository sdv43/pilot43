import type { Chat, ChatSettings, Workspace } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createChatStore(storage: AgentStorage) {
  async function getExistingChat(chatId: Chat["id"]): Promise<Chat> {
    const chat = await storage.chats.getById(chatId)
    if (!chat) {
      throw new Error("Chat not found")
    }
    return chat
  }

  async function saveChat(chat: Chat): Promise<Chat> {
    await storage.chats.put(chat)
    return chat
  }

  return {
    getChatsByWorkspace: (workspaceId: Workspace["id"]): Promise<Chat[]> => {
      return storage.chats.getByWorkspace(workspaceId)
    },

    getChatById: (id: Chat["id"]): Promise<Chat | undefined> => {
      return storage.chats.getById(id)
    },

    createChat: async (
      workspaceId: Workspace["id"],
      title: string,
      settings: ChatSettings = { tools: [] },
    ): Promise<Chat> => {
      const now = Date.now()
      const newChat: Chat = {
        createdAt: now,
        id: crypto.randomUUID(),
        workspaceId,
        title,
        settings,
        updatedAt: now,
      }
      return await saveChat(newChat)
    },

    updateChatSettings: async (
      chatId: Chat["id"],
      settings: ChatSettings,
    ): Promise<Chat> => {
      const chat = await getExistingChat(chatId)
      return await saveChat({ ...chat, settings })
    },

    updateChatTitle: async (
      chatId: Chat["id"],
      title: string,
    ): Promise<Chat> => {
      const chat = await getExistingChat(chatId)
      return await saveChat({ ...chat, title })
    },

    updateChatTimestamp: async (
      chatId: Chat["id"],
      updatedAt: number = Date.now(),
    ): Promise<Chat> => {
      const chat = await getExistingChat(chatId)
      return await saveChat({ ...chat, updatedAt })
    },

    /**
     * Replaces the chat's step-by-step todo checklist. The checklist is bound
     * to the chat (not a single message run) so it is passed to the model as
     * context on every turn and stays visible while set. Passing an empty
     * string (or null) clears it.
     */
    updateChatTodoList: async (
      chatId: Chat["id"],
      todoList: null | string,
    ): Promise<Chat> => {
      const chat = await getExistingChat(chatId)
      const normalized = todoList && todoList.trim() ? todoList : null
      return await saveChat({
        ...chat,
        todoList: normalized,
        updatedAt: Date.now(),
      })
    },

    deleteChat: async (id: Chat["id"]): Promise<void> => {
      await storage.chats.delete(id)
    },
  }
}
