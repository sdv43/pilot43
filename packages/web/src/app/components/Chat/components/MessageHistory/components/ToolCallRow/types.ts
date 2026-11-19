import type { MessageAssistantTool } from "@pilot43/protocol"

export interface ToolCallRowProps {
  /** False once the run ended; a call still running then shows "Stopped". */
  isRunActive?: boolean
  onOpen: () => void
  tool: MessageAssistantTool
}
