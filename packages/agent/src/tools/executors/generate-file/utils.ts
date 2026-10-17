import {
  generatedFilePreviewCharacters,
  maxGeneratedFileFilenameLength,
} from "../../const"

/** Fallback MIME type for unknown or missing extensions. */
export const defaultGeneratedFileMimeType = "text/plain"

/** Allowed filename extensions mapped to their MIME types. */
export const generatedFileExtensionMimeTypes: Record<string, string> = {
  csv: "text/csv",
  html: "text/html",
  json: "application/json",
  log: "text/plain",
  md: "text/markdown",
  svg: "image/svg+xml",
  txt: "text/plain",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
}

/**
 * Normalizes a model-provided file name into a safe, flat filename with an
 * allowed extension. Strips directories, path traversal fragments and control
 * characters, truncates the length and falls back to `generated.txt` when
 * nothing usable remains.
 */
export function sanitizeGeneratedFilename(input: string): string {
  const baseName = input
    .replace(/[\\/]/g, "")
    .replace(/\.\./g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()

  const normalized =
    baseName.length > maxGeneratedFileFilenameLength
      ? baseName.slice(0, maxGeneratedFileFilenameLength)
      : baseName

  if (!normalized) {
    return "generated.txt"
  }

  const extensionMatch = /\.([a-z0-9]+)$/i.exec(normalized)
  const extension = extensionMatch?.[1]?.toLowerCase()

  if (!extension || !(extension in generatedFileExtensionMimeTypes)) {
    return "generated.txt"
  }

  return normalized
}

/** Resolves the MIME type for a sanitized file name. */
export function getGeneratedFileMimeType(filename: string): string {
  const extensionMatch = /\.([a-z0-9]+)$/i.exec(filename)
  const extension = extensionMatch?.[1]?.toLowerCase()

  if (!extension) {
    return defaultGeneratedFileMimeType
  }

  return (
    generatedFileExtensionMimeTypes[extension] ?? defaultGeneratedFileMimeType
  )
}

/** Builds the compact, model-facing metadata result for a generated file. */
export function buildGeneratedFileResult(
  id: string,
  filename: string,
  mimeType: string,
  content: string,
): Record<string, unknown> {
  return {
    fileId: id,
    filename,
    lines: content ? content.split("\n").length : 0,
    mimeType,
    ok: true,
    preview:
      content.length > generatedFilePreviewCharacters
        ? `${content.slice(0, generatedFilePreviewCharacters)}…`
        : content,
    size: content.length,
  }
}
