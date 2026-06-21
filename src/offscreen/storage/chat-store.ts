import type { Chat, ChatSettings, Workspace } from "@/shared/api"

import { getDB } from "./db"

export async function getChatsByWorkspace(
  workspaceId: Workspace["id"],
): Promise<Chat[]> {
  const db = await getDB()
  const allChats = (await db.getAll("chats")) as Chat[]
  return allChats.filter((chat) => chat.workspaceId === workspaceId)
}

export async function getChatById(id: Chat["id"]): Promise<Chat | undefined> {
  const db = await getDB()
  return (await db.get("chats", id)) as Chat | undefined
}

export async function createChat(
  workspaceId: Workspace["id"],
  title: string,
  settings: ChatSettings = { tools: [] },
): Promise<Chat> {
  const db = await getDB()
  const now = Date.now()
  const newChat: Chat = {
    createdAt: now,
    id: crypto.randomUUID(),
    workspaceId,
    title,
    settings,
    updatedAt: now,
  }
  await db.put("chats", newChat)
  return newChat
}

export async function updateChatSettings(
  chatId: Chat["id"],
  settings: ChatSettings,
): Promise<Chat> {
  const db = await getDB()
  const chat = (await db.get("chats", chatId)) as Chat | undefined
  if (!chat) {
    throw new Error("Chat not found")
  }
  const updatedChat: Chat = { ...chat, settings }
  await db.put("chats", updatedChat)
  return updatedChat
}

export async function updateChatTitle(
  chatId: Chat["id"],
  title: string,
): Promise<Chat> {
  const db = await getDB()
  const chat = (await db.get("chats", chatId)) as Chat | undefined
  if (!chat) {
    throw new Error("Chat not found")
  }

  const updatedChat: Chat = { ...chat, title, updatedAt: Date.now() }
  await db.put("chats", updatedChat)
  return updatedChat
}

export async function updateChatTimestamp(
  chatId: Chat["id"],
  updatedAt: number = Date.now(),
): Promise<Chat> {
  const db = await getDB()
  const chat = (await db.get("chats", chatId)) as Chat | undefined
  if (!chat) {
    throw new Error("Chat not found")
  }

  const updatedChat: Chat = { ...chat, updatedAt }
  await db.put("chats", updatedChat)
  return updatedChat
}

/**
 * Replaces the chat's step-by-step todo checklist. The checklist is bound to
 * the chat (not a single message run) so it is passed to the model as context
 * on every turn and stays visible while set. Passing an empty string (or null)
 * clears it.
 */
export async function updateChatTodoList(
  chatId: Chat["id"],
  todoList: null | string,
): Promise<Chat> {
  const db = await getDB()
  const chat = (await db.get("chats", chatId)) as Chat | undefined
  if (!chat) {
    throw new Error("Chat not found")
  }

  const normalized = todoList && todoList.trim() ? todoList : null
  const updatedChat: Chat = {
    ...chat,
    todoList: normalized,
    updatedAt: Date.now(),
  }
  await db.put("chats", updatedChat)
  return updatedChat
}

export async function deleteChat(id: Chat["id"]): Promise<void> {
  const db = await getDB()
  await db.delete("chats", id)
}
