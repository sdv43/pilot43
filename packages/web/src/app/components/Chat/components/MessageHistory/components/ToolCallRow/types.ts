import type { MessageAssistantTool } from "@pilot43/protocol"

export interface ToolCallRowProps {
  onOpen: () => void
  tool: MessageAssistantTool
}
