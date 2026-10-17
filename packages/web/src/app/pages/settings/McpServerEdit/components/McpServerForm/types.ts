import type { McpServer } from "@pilot43/protocol"

export interface McpServerFormProps {
  /** Server being edited; `undefined` when adding one. */
  server: McpServer | undefined
  servers: McpServer[]
}
