import type { McpServer, ModelTool } from "@/shared/api/entities"

export interface McpGroupProps {
  isCollapsed: boolean
  server: McpServer
  toolsState: Record<string, boolean>
  onChange: (
    serverName: string,
    isEnabled: boolean,
    serverTools: ModelTool[],
  ) => void
  onCollapse: (serverName: string) => void
  onHydrateTools: (serverName: string, serverTools: ModelTool[]) => void
  onToolChange: (toolName: string, isEnabled: boolean) => void
}
