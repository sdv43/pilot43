import type { McpServer, WorkspaceToolPermissions } from "@pilot43/protocol"

export interface McpToolGroupProps {
  onChange: (toolsState: Record<string, boolean>) => void
  permissions: undefined | WorkspaceToolPermissions
  server: McpServer
  toolsState: Record<string, boolean>
}
