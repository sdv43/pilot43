import type { ModelProviderModelSettings } from "@pilot43/protocol"

export interface ModelLevelsRowProps {
  isExpanded: boolean
  modelName: string
  onChange: (levels: string[], defaultLevel?: null | string) => void
  /** Entered window in tokens, or `undefined` when the field is cleared. */
  onContextWindowChange: (contextWindow: number | undefined) => void
  onToggle: () => void
  settings: ModelProviderModelSettings | undefined
}
