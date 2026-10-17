import type { ModelProviderModelSettings } from "@pilot43/protocol"

export interface ModelLevelsRowProps {
  isExpanded: boolean
  modelName: string
  onChange: (levels: string[], defaultLevel?: null | string) => void
  onToggle: () => void
  settings: ModelProviderModelSettings | undefined
}
