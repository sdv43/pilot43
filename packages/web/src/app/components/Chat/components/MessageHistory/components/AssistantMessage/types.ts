import type {
  MessageAssistant,
  MessageAssistantTool,
  MessageRun,
} from "@pilot43/protocol"

export interface AssistantMessageProps {
  /** False once the run ended (calls still running were stopped). */
  isRunActive?: boolean
  isStreaming: boolean
  message: MessageAssistant
  messageRunId: MessageRun["id"]
  onOpenTool: (tool: MessageAssistantTool) => void
}
