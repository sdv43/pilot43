import type { Prompt } from "@pilot43/protocol"

export interface PromptRowProps {
  onDelete: () => void
  /** Built-in prompts: create an editable copy. */
  onDuplicate: () => void
  onEdit: () => void
  prompt: Prompt
}
