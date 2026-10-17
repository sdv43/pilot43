import type { MessageAssistantTool, MessageRun } from "@pilot43/protocol"

export interface ToolApprovalCardProps {
  messageRunId: MessageRun["id"]
  onOpen: () => void
  tool: MessageAssistantTool
}
