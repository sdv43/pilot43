import type { ContinuationPrompt as ContinuationPromptData } from "@pilot43/protocol"

export interface ContinuationPromptProps {
  messageRunId: string
  prompt: ContinuationPromptData
}
