import type { MessageAssistantTool } from "@pilot43/protocol"

import type { AgentStep } from "../../types"

export interface StepItemProps {
  /** Notes keep to two lines in the live timeline. */
  isClamped: boolean
  isRunActive: boolean
  onOpenTool: (tool: MessageAssistantTool) => void
  step: AgentStep
}
