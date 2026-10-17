import type { ModelProvider } from "../../../../../../queries/modelProvider"

export interface ProviderTypePickerProps {
  disabled?: boolean
  onChange: (type: ModelProvider["type"]) => void
  value: ModelProvider["type"]
}
