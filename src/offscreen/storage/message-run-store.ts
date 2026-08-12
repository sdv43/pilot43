import type { Chat, MessageRun } from "@/shared/api"

import { getDB } from "./db"

export async function getMessageRunsByChat(
  chatId: Chat["id"],
): Promise<MessageRun[]> {
  const db = await getDB()
  const index = db.transaction("messageRuns").store.index("chatId")
  return ((await index.getAll(chatId)) as MessageRun[]).sort(
    (a, b) => a.createdAt - b.createdAt,
  )
}

export async function getMessageRunById(
  id: MessageRun["id"],
): Promise<MessageRun | undefined> {
  const db = await getDB()
  return (await db.get("messageRuns", id)) as MessageRun | undefined
}

export async function createMessageRun(
  messageRun: MessageRun,
): Promise<MessageRun> {
  const db = await getDB()
  await db.put("messageRuns", messageRun)
  return messageRun
}

export async function updateMessageRun(
  messageRun: MessageRun,
): Promise<MessageRun> {
  const db = await getDB()
  await db.put("messageRuns", messageRun)
  return messageRun
}

export async function deleteMessageRun(id: MessageRun["id"]): Promise<void> {
  const db = await getDB()
  await db.delete("messageRuns", id)
}

export async function deleteMessageRunsByChat(
  chatId: Chat["id"],
): Promise<void> {
  const db = await getDB()
  const messageRuns = await getMessageRunsByChat(chatId)
  const tx = db.transaction("messageRuns", "readwrite")
  await Promise.all([
    ...messageRuns.map((run) => tx.store.delete(run.id)),
    tx.done,
  ])
}

/**
 * Deletes every message run created strictly after the run identified by
 * `messageRunId` within the same chat. Returns the deleted runs so callers can
 * abort any in-progress generations and notify the sidepanel.
 */
export async function deleteMessageRunsAfter(
  messageRunId: MessageRun["id"],
): Promise<MessageRun[]> {
  const db = await getDB()
  const target = await getMessageRunById(messageRunId)
  if (!target) {
    return []
  }

  const runs = (await getMessageRunsByChat(target.chatId)).filter(
    (run) => run.createdAt > target.createdAt,
  )

  if (runs.length === 0) {
    return []
  }

  const tx = db.transaction("messageRuns", "readwrite")
  await Promise.all([...runs.map((run) => tx.store.delete(run.id)), tx.done])

  return runs
}
