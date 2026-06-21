import type {
  ModelProvider,
  OpenAIModelProvider,
} from "@/sidepanel/queries/modelProvider"

export interface OpenAIProviderFormProps {
  provider: OpenAIModelProvider
  onProviderChange: (p: ModelProvider) => void
}
