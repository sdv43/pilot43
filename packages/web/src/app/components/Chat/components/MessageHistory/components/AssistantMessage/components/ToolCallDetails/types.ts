import type { MessageAssistantTool } from "@pilot43/protocol"

export interface ToolCallDetailsProps {
  args: MessageAssistantTool["args"]
  result: MessageAssistantTool["result"]
}

export interface ToolJsonSectionProps {
  title: string
  value: unknown
}
