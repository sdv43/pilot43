import type { Prompt } from "@pilot43/protocol"

export interface PromptRowProps {
  onDelete: () => void
  onEdit: () => void
  prompt: Prompt
}
