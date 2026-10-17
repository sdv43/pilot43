import type { McpServer, Workspace } from "@pilot43/protocol"

export interface WorkspaceFormProps {
  servers: McpServer[]
  workspace: undefined | Workspace
}
