import type { Prompt } from "@pilot43/protocol"

export interface PromptFormProps {
  /** Prompt being edited; `undefined` when creating one. */
  prompt: Prompt | undefined
}
