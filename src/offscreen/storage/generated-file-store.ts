import type { Chat, GeneratedFile } from "@/shared/api"

import { getDB } from "./db"

export async function createGeneratedFile(
  file: GeneratedFile,
): Promise<GeneratedFile> {
  const db = await getDB()
  await db.put("generatedFiles", file)
  return file
}

/**
 * Appends a text chunk to an existing generated file within a single
 * readwrite transaction so concurrent tool calls can never interleave a stale
 * read with a newer write.
 */
export async function appendToGeneratedFile(
  id: GeneratedFile["id"],
  chunk: string,
): Promise<GeneratedFile> {
  const db = await getDB()
  const tx = db.transaction("generatedFiles", "readwrite")

  try {
    const existing = (await tx.store.get(id)) as GeneratedFile | undefined

    if (!existing) {
      throw new Error(`Generated file \`${id}\` not found.`)
    }

    const updated: GeneratedFile = {
      ...existing,
      content: existing.content + chunk,
      size: existing.content.length + chunk.length,
      updatedAt: Date.now(),
    }

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
}

export async function getGeneratedFile(
  id: GeneratedFile["id"],
): Promise<GeneratedFile | undefined> {
  const db = await getDB()
  return (await db.get("generatedFiles", id)) as GeneratedFile | undefined
}

export async function deleteGeneratedFilesByChat(
  chatId: Chat["id"],
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("generatedFiles", "readwrite")
  const ids = await tx.store.index("chatId").getAllKeys(chatId)

  for (const id of ids) {
    await tx.store.delete(id)
  }

  await tx.done
}
