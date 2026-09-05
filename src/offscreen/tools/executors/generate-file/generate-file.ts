import type { Chat } from "@/shared/api"

import {
  appendToGeneratedFile,
  createGeneratedFile,
} from "../../../storage/generated-file-store"
import {
  maxGeneratedFileChunkCharacters,
  maxGeneratedFileTotalCharacters,
} from "../../const"
import { requireStringValue } from "../shared"
import {
  buildGeneratedFileResult,
  getGeneratedFileMimeType,
  sanitizeGeneratedFilename,
} from "./utils"
/**
 * Executes the `generate_file` tool: persists a text file (or a chunk of one)
 * in the generated files store and returns compact metadata so the content
 * never enters the conversation history sent back to the model.
 */
export async function executeGenerateFileTool(
  args: Record<string, unknown>,
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  const content = requireStringValue(args, "content")

  if (content.length > maxGeneratedFileChunkCharacters) {
    throw new Error(
      `Parameter \`content\` exceeds ${maxGeneratedFileChunkCharacters} characters. Split the file into chunks and use mode "append".`,
    )
  }

  const mode = args.mode === "append" ? "append" : "create"

  if (mode === "append") {
    return await appendChunk(args, content)
  }

  return await createFile(args, content, chatId)
}

async function createFile(
  args: Record<string, unknown>,
  content: string,
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  const filename = sanitizeGeneratedFilename(
    requireStringValue(args, "filename"),
  )
  const id = crypto.randomUUID()
  const now = Date.now()

  const file = await createGeneratedFile({
    chatId,
    content,
    createdAt: now,
    filename,
    id,
    mimeType: getGeneratedFileMimeType(filename),
    size: content.length,
    updatedAt: now,
  })

  return buildGeneratedFileResult(
    file.id,
    file.filename,
    file.mimeType,
    file.content,
  )
}

async function appendChunk(
  args: Record<string, unknown>,
  content: string,
): Promise<Record<string, unknown>> {
  const fileId = args.file_id

  if (typeof fileId !== "string" || !fileId.trim()) {
    throw new Error(
      'Parameter `file_id` must be a non-empty string when mode is "append".',
    )
  }

  const file = await appendToGeneratedFile(fileId, content)

  if (file.size > maxGeneratedFileTotalCharacters) {
    throw new Error(
      `The file would exceed ${maxGeneratedFileTotalCharacters} characters in total. Finish the file where it is.`,
    )
  }

  return buildGeneratedFileResult(
    file.id,
    file.filename,
    file.mimeType,
    file.content,
  )
}
