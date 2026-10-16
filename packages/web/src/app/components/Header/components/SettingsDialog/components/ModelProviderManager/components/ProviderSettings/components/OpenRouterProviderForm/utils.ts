import type {
  ModelProvider,
  OpenRouterModelProvider,
} from "../../../../../../../../../../../queries/modelProvider"

export function getProviderFromOpenRouterType(
  provider: OpenRouterModelProvider,
  type: ModelProvider["type"],
): ModelProvider {
  if (type === "openrouter") {
    return provider
  }

  if (type === "openai") {
    return {
      ...provider,
      type: "openai",
      settings: {
        apiKey: provider.settings.apiKey,
      },
    }
  }

  return {
    ...provider,
    type: "ollama",
    settings: { host: "" },
  }
}
