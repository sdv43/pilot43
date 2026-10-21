/**
 * An image a tool returned for the model to look at, e.g. an MCP `image`
 * content part. Images are stored on the tool result under
 * {@link toolResultImagesKey} and sent to the model as image input after the
 * tool messages rather than as base64 text inside the JSON tool message.
 */
export interface ToolResultImage {
  /** Base64-encoded image bytes, without a `data:` prefix. */
  data: string
  mimeType: string
}

export const toolResultImagesKey = "images"

/** Image types every supported model provider accepts as image input. */
export const toolResultImageMimeTypes: readonly string[] = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]

function isToolResultImage(value: unknown): value is ToolResultImage {
  if (!value || typeof value !== "object") {
    return false
  }

  const { data, mimeType } = value as Record<string, unknown>

  return (
    typeof data === "string" &&
    data.length > 0 &&
    typeof mimeType === "string" &&
    toolResultImageMimeTypes.includes(mimeType)
  )
}

/** The images stored on a tool result (none when the field is missing). */
export function getToolResultImages(
  result: null | Record<string, unknown> | undefined,
): ToolResultImage[] {
  const images = result?.[toolResultImagesKey]

  return Array.isArray(images) ? images.filter(isToolResultImage) : []
}

/**
 * The tool result with its images replaced by `replace(images)`, e.g. a note
 * for the model or size placeholders for display. Results without images are
 * returned unchanged.
 */
export function replaceToolResultImages(
  result: Record<string, unknown>,
  replace: (images: ToolResultImage[]) => unknown,
): Record<string, unknown> {
  const images = getToolResultImages(result)

  if (images.length === 0) {
    return result
  }

  return { ...result, [toolResultImagesKey]: replace(images) }
}

/** Approximate decoded size of a base64 string, in bytes. */
export function getBase64ByteLength(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0

  return Math.max(0, Math.floor((data.length * 3) / 4) - padding)
}
