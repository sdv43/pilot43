import type { ModelProvider } from "../../../../../../queries/modelProvider"

export interface ProviderRowProps {
  onDelete: () => void
  onEdit: () => void
  provider: ModelProvider
}
