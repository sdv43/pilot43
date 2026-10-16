import type {
  ModelProvider,
  OllamaModelProvider,
} from "../../../../../../../../../../../queries/modelProvider"

export interface OllamaProviderFormProps {
  provider: OllamaModelProvider
  onProviderChange: (p: ModelProvider) => void
}
