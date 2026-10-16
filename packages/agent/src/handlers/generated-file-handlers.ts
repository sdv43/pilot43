import type { GeneratedFile } from "@pilot43/protocol"

import type { AgentContext } from "../context"

/**
 * Returns the full generated file (including content) by id. Throws when the
 * file no longer exists — e.g. its chat was deleted.
 */
export async function handleGeneratedFileGet(
  ctx: AgentContext,
  fileId: GeneratedFile["id"],
): Promise<GeneratedFile> {
  const file = await ctx.store.getGeneratedFile(fileId)

  if (!file) {
    throw new Error("File not found. The chat it belongs to may be deleted.")
  }

  return file
}
