import type { FileAttachment } from "@/shared/api"

import type {
  EditorCommandOption,
  EditorCommandType,
} from "./components/Editor/types"

import { createFileCommand } from "../../utils"
import { commandCharacterRegexNot } from "./components/Editor/const"

const commandPrefix = "file:"
const maxCommandLength = 30

const imageMediaTypeByExtension: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

const textFileExtensionPattern =
  /\.(cjs|conf|cpp|cs|css|csv|go|gql|graphql|h|hpp|htm|html|ini|java|js|json|jsx|kt|less|log|lua|m|md|markdown|mjs|php|py|rb|rs|sass|scss|sh|sql|swift|toml|ts|tsx|txt|vue|xml|yaml|yml|zsh)$/i

const textMediaTypePattern =
  /^(text\/|application\/(graphql-response\+json|javascript|json|ld\+json|rtf|sql|toml|typescript|x-httpd-php|x-javascript|x-sh|x-typescript|x-yaml|xml|yaml)|image\/svg\+xml$)/i

function getCommandTokenPrefix(type: EditorCommandType) {
  return type === "slash" ? "/" : "#"
}

function normalizeFileCommandBase(fileName: string) {
  const normalizedFileName = fileName.trim() || "file"
  const sanitizedFileName = normalizedFileName.replace(
    commandCharacterRegexNot,
    "_",
  )

  return sanitizedFileName.length > 0 ? sanitizedFileName : "file"
}

function truncateCommandBase(commandBase: string, maxLength: number) {
  if (commandBase.length <= maxLength) {
    return commandBase
  }

  if (maxLength <= 3) {
    return commandBase.slice(0, Math.max(1, maxLength))
  }

  return `${commandBase.slice(0, maxLength - 3)}...`
}

function createUniqueFileCommand(
  fileName: string,
  usedCommandNames: Set<string>,
) {
  const commandBase = normalizeFileCommandBase(fileName)
  let suffix = 1

  while (true) {
    const suffixText = suffix === 1 ? "" : `_${suffix}`
    const maxBaseLength = Math.max(
      1,
      maxCommandLength - commandPrefix.length - suffixText.length,
    )
    const candidate = createFileCommand(
      `${truncateCommandBase(commandBase, maxBaseLength)}${suffixText}`,
    )

    if (!usedCommandNames.has(candidate)) {
      usedCommandNames.add(candidate)
      return candidate
    }

    suffix += 1
  }
}

function getFileExtension(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".")

  if (extensionIndex < 0) {
    return ""
  }

  return fileName.slice(extensionIndex + 1).toLowerCase()
}

function getFileMediaType(file: File) {
  if (file.type) {
    return file.type
  }

  const imageMediaType = imageMediaTypeByExtension[getFileExtension(file.name)]

  if (imageMediaType) {
    return imageMediaType
  }

  if (textFileExtensionPattern.test(file.name)) {
    return "text/plain"
  }

  return "application/octet-stream"
}

function isImageMediaType(mediaType: string) {
  return mediaType.startsWith("image/")
}

function isTextFile(fileName: string, mediaType: string) {
  return (
    textMediaTypePattern.test(mediaType) ||
    textFileExtensionPattern.test(fileName)
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      const { result } = reader

      if (typeof result === "string") {
        resolve(result)
        return
      }

      reject(new Error(`Cannot read file: ${file.name}`))
    })

    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error(`Cannot read file: ${file.name}`))
    })

    reader.readAsDataURL(file)
  })
}

async function readFileAttachment(file: File): Promise<FileAttachment> {
  const mediaType = getFileMediaType(file)
  const content = isImageMediaType(mediaType)
    ? await readFileAsDataUrl(file)
    : isTextFile(file.name, mediaType)
      ? await file.text()
      : await readFileAsDataUrl(file)

  return {
    type: "file",
    content,
    mediaType,
    name: file.name,
    size: file.size,
  }
}

export async function createFileCommandOptions(
  files: readonly File[],
  existingCommands: readonly EditorCommandOption[],
): Promise<EditorCommandOption[]> {
  const usedCommandNames = new Set(
    existingCommands
      .filter((command) => command.type === "hash")
      .map((command) => command.command),
  )

  const attachments = await Promise.all(
    files.map((file) => readFileAttachment(file)),
  )

  return attachments.map((attachment) => ({
    attachment,
    command: createUniqueFileCommand(attachment.name, usedCommandNames),
    key: createFileCommand(crypto.randomUUID()),
    type: "hash",
  }))
}

export function insertCommandOptionsAtSelection(
  text: string,
  options: ReadonlyArray<Pick<EditorCommandOption, "command" | "type">>,
  selectionStart: number,
  selectionEnd: number,
) {
  const before = text.slice(0, selectionStart)
  const after = text.slice(selectionEnd)
  const previousCharacter = before.at(-1)
  const nextCharacter = after[0]
  const needsLeadingSpace = !!previousCharacter && !/\s/.test(previousCharacter)
  const needsTrailingSpace = !nextCharacter || !/\s/.test(nextCharacter)
  const insertedCommandText = options
    .map((option) => `${getCommandTokenPrefix(option.type)}${option.command}`)
    .join(" ")
  const insertedText = `${needsLeadingSpace ? " " : ""}${insertedCommandText}${needsTrailingSpace ? " " : ""}`

  return {
    nextSelection: before.length + insertedText.length,
    nextText: `${before}${insertedText}${after}`,
  }
}
