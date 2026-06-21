import type { ModelProvider } from "../storage"
import type { ModelAdapter } from "./types"

import { OllamaAdapter } from "./ollama-adapter"
import { OpenAIAdapter } from "./openai-adapter"

export function createModelAdapter(
  provider: ModelProvider,
  modelName: string,
): ModelAdapter {
  if (provider.type === "ollama") {
    return new OllamaAdapter(provider, modelName)
  } else if (provider.type === "openai") {
    return new OpenAIAdapter(provider, modelName)
  }
  // This should never happen due to ModelProvider type definition
  throw new Error(`Unsupported provider type`)
}
