import type { McpServer } from "@pilot43/protocol"

export interface McpServerRowProps {
  onDelete: () => void
  onEdit: () => void
  server: McpServer
}
