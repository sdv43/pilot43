import type { ModelProviderModel } from "@pilot43/protocol"

import type { ModelProvider } from "../../../../../../../../../queries/modelProvider"

export interface ReasoningPanelProps {
  effort: null | string
  model: ModelProviderModel
  onEffortChange: (effort: string) => void
  onThinkingChange: (enabled: boolean) => void
  provider: ModelProvider
  thinkingEnabled: boolean
}
