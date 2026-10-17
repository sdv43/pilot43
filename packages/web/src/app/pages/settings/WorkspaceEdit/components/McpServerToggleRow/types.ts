import type { McpServer } from "@pilot43/protocol"

export interface McpServerToggleRowProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  server: McpServer
}
