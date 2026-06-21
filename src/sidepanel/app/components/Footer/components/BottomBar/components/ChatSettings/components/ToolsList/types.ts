import type { McpServer, ModelTool } from "@/shared/api/entities"

export type ToolItem = Pick<
  ModelTool,
  "defaultEnabled" | "description" | "hidden" | "name" | "shortDescription"
>

export interface ToolsListProps {
  mcpServers: McpServer[]
  onChange: (nextToolsState: Record<string, boolean>) => void
  tools: ToolItem[]
  toolsState: Record<string, boolean>
}
