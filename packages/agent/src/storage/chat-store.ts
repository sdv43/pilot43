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

  /** Last queued update per chat. */
  const updateQueues = new Map<Chat["id"], Promise<Chat>>()

  /**
   * Applies `change` to the stored chat and saves it. Updates of a chat run
   * one at a time: each reads the chat and writes it back whole, so
   * overlapping updates (settings, title, generation state, …) would
   * otherwise overwrite each other's fields with stale values.
   */
  function updateChat(
    chatId: Chat["id"],
    change: (chat: Chat) => Chat,
  ): Promise<Chat> {
    const previous = updateQueues.get(chatId)
    const next = (previous ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => await saveChat(change(await getExistingChat(chatId))))
    const cleanUp = () => {
      if (updateQueues.get(chatId) === next) {
        updateQueues.delete(chatId)
      }
    }

    updateQueues.set(chatId, next)
    next.then(cleanUp, cleanUp)

    return next
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

    updateChatSettings: (
      chatId: Chat["id"],
      settings: ChatSettings,
    ): Promise<Chat> => {
      return updateChat(chatId, (chat) => ({ ...chat, settings }))
    },

    updateChatTitle: (chatId: Chat["id"], title: string): Promise<Chat> => {
      return updateChat(chatId, (chat) => ({ ...chat, title }))
    },

    /** Updates the generation flag and history preview of a chat. */
    updateChatState: (
      chatId: Chat["id"],
      state: Pick<Chat, "isGenerating" | "preview">,
    ): Promise<Chat> => {
      return updateChat(chatId, (chat) => ({ ...chat, ...state }))
    },

    updateChatTimestamp: (
      chatId: Chat["id"],
      updatedAt: number = Date.now(),
    ): Promise<Chat> => {
      return updateChat(chatId, (chat) => ({ ...chat, updatedAt }))
    },

    /**
     * Replaces the chat's step-by-step todo checklist. The checklist is bound
     * to the chat (not a single message run) so it is passed to the model as
     * context on every turn and stays visible while set. Passing an empty
     * string (or null) clears it.
     */
    updateChatTodoList: (
      chatId: Chat["id"],
      todoList: null | string,
    ): Promise<Chat> => {
      const normalized = todoList && todoList.trim() ? todoList : null
      return updateChat(chatId, (chat) => ({
        ...chat,
        todoList: normalized,
        updatedAt: Date.now(),
      }))
    },

    deleteChat: async (id: Chat["id"]): Promise<void> => {
      await storage.chats.delete(id)
    },
  }
}
