import type { McpServer } from "@/shared/api"
import type { JsonObject } from "@/shared/libs/json-editor"

/**
 * The JSON document edited in the MCP settings form: a `servers` object keyed
 * by MCP server name. Each value stores the server transport config and any
 * extra transport options (for example `headers`).
 */
export type McpServersDocumentServer = JsonObject & {
  type: "http"
  url: string
  headers?: Record<string, string>
}

export type McpServersDocument = JsonObject & {
  servers: Record<string, McpServersDocumentServer>
}

export interface McpSettingsFormProps {
  initialServers: McpServer[]
}
