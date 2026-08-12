import type {
  ModelProvider,
  OpenRouterModelProvider,
} from "@/sidepanel/queries/modelProvider"

export interface OpenRouterProviderFormProps {
  provider: OpenRouterModelProvider
  onProviderChange: (p: ModelProvider) => void
}
