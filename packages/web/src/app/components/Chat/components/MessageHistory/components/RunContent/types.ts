import type { MessageAssistantTool, MessageRun } from "@pilot43/protocol"

export interface RunContentProps {
  onOpenTool: (tool: MessageAssistantTool) => void
  run: MessageRun
}
