import type {
  ModelProvider,
  OpenRouterModelProvider,
} from "../../../../../../../../../../../queries/modelProvider"

export interface OpenRouterProviderFormProps {
  provider: OpenRouterModelProvider
  onProviderChange: (p: ModelProvider) => void
}
