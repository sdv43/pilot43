import type {
  ModelProvider,
  OllamaModelProvider,
} from "@/sidepanel/queries/modelProvider"

export function getProviderFromOllamaType(
  provider: OllamaModelProvider,
  type: ModelProvider["type"],
): ModelProvider {
  if (type === "ollama") {
    return provider
  }

  if (type === "openrouter") {
    return {
      ...provider,
      type: "openrouter",
      settings: { apiKey: "" },
    }
  }

  return {
    ...provider,
    type: "openai",
    settings: { apiKey: "" },
  }
}
