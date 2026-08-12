import type { ModelProvider } from "@/sidepanel/queries/modelProvider"

export interface ProviderTypeOption {
  label: string
  value: ModelProvider["type"]
}

export interface ProviderNameAndTypeFieldsProps {
  name: string
  namePlaceholder: string
  type: ProviderTypeOption["value"]
  onNameChange: (name: string) => void
  onTypeChange: (type: ProviderTypeOption["value"]) => void
}
