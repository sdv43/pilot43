import type { Chat } from "@pilot43/protocol"

import type { Tool } from "../../types"

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
    return await appendChunk(args, content, chatId)
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
  chatId: Chat["id"],
): Promise<Record<string, unknown>> {
  const fileId = args.file_id

  if (typeof fileId !== "string" || !fileId.trim()) {
    throw new Error(
      'Parameter `file_id` must be a non-empty string when mode is "append".',
    )
  }

  const file = await appendToGeneratedFile(fileId, content, {
    chatId,
    maxSize: maxGeneratedFileTotalCharacters,
  })

  return buildGeneratedFileResult(
    file.id,
    file.filename,
    file.mimeType,
    file.content,
  )
}

export const generateFileTool: Tool = {
  definition: {
    id: "generate_file",
    name: "generate_file",
    shortDescription: "Generate a text file for the user to download.",
    description:
      'Generate a text file (md, txt, csv, json, html, xml, yaml, yml, log, svg) that the user can download from the chat. Use it whenever the user asks to create a file, save a document, or export data instead of pasting long content into the reply.\n\n`filename` is a plain file name with an allowed extension (no directories or path separators; sanitized automatically). `content` is the full text to write. `mode` is `"create"` (default) for a new file or `"append"` to continue an existing one; `append` requires `file_id` — the `fileId` returned by the earlier create call — and is the way to build files larger than 200000 characters: call repeatedly with chunks, then summarize.\n\nEach call returns only metadata (fileId, filename, mimeType, size, lines, preview) — never echo the content back. The total file size cannot exceed 1000000 characters.',
    defaultEnabled: true,
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      content: {
        description:
          "Full text content to write (create) or chunk to append (append).",
        type: "string",
      },
      file_id: {
        description:
          "Required for mode=append: the fileId returned by the earlier create call.",
        type: "string",
      },
      filename: {
        description:
          "File name with extension, e.g. report.md. Path separators are not allowed.",
        type: "string",
      },
      mode: {
        description:
          'Either "create" (default) for a new file or "append" to continue an existing one.',
        type: "string",
      },
    },
    required: ["filename", "content"],
    type: "object",
  },
  execute: (args, { chatId }) => executeGenerateFileTool(args, chatId),
}
