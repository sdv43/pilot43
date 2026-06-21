import type { McpServer } from "@/shared/api"

export interface McpServersDocument {
  servers: Record<
    string,
    { type: "http"; url: string; headers?: Record<string, string> }
  >
}

export interface McpSettingsFormProps {
  initialServers: McpServer[]
}
