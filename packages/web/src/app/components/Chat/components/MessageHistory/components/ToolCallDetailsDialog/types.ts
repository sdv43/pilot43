import type { MessageAssistantTool } from "@pilot43/protocol"

export interface ToolCallDetailsDialogProps {
  onClose: () => void
  tool: MessageAssistantTool | null
}
