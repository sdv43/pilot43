import type { MessageAssistantTool } from "@/shared/api/entities"

export interface ToolCallDetailsProps {
  args: MessageAssistantTool["args"]
  result: MessageAssistantTool["result"]
}

export interface ToolJsonSectionProps {
  title: string
  value: unknown
}
