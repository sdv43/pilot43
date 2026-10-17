import type {
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
} from "@pilot43/protocol"

export interface AssistantMessageProps {
  isStreaming: boolean
  message: MessageAssistant
  messageRunId: MessageRun["id"]
  onOpenTool: (tool: MessageAssistantTool) => void
}
