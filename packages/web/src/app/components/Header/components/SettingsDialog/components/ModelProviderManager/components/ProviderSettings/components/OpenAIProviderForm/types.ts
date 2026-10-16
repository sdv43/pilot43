import type {
  ModelProvider,
  OpenAIModelProvider,
} from "../../../../../../../../../../../queries/modelProvider"

export interface OpenAIProviderFormProps {
  provider: OpenAIModelProvider
  onProviderChange: (p: ModelProvider) => void
}
