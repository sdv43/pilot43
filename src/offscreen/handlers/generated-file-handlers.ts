import type { GeneratedFile } from "@/shared/api"

import { getGeneratedFile } from "../storage"

/**
 * Returns the full generated file (including content) by id. Throws when the
 * file no longer exists — e.g. its chat was deleted.
 */
export async function handleGeneratedFileGet(
  fileId: GeneratedFile["id"],
): Promise<GeneratedFile> {
  const file = await getGeneratedFile(fileId)

  if (!file) {
    throw new Error("File not found. The chat it belongs to may be deleted.")
  }

  return file
}
