import type {
  ModelProvider,
  OllamaModelProvider,
} from "@/sidepanel/queries/modelProvider"

export interface OllamaProviderFormProps {
  provider: OllamaModelProvider
  onProviderChange: (p: ModelProvider) => void
}
