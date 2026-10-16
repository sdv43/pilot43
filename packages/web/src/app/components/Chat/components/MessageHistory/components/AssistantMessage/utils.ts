import type { AssistantMessageProps } from "./types"

export function getGeneratedFileToolResults(
  tools: AssistantMessageProps["message"]["tools"],
) {
  return tools.flatMap((tool) => {
    if (tool.name !== "generate_file" || !tool.result?.ok) {
      return []
    }

    const fileId = tool.result["fileId"]
    const filename = tool.result["filename"]
    const mimeType = tool.result["mimeType"]
    const size = tool.result["size"]

    if (
      typeof fileId !== "string" ||
      typeof filename !== "string" ||
      typeof mimeType !== "string" ||
      typeof size !== "number"
    ) {
      return []
    }

    return [{ fileId, filename, mimeType, size }]
  })
}
