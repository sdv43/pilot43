import type {
  ModelProvider,
  OpenAIModelProvider,
} from "@/sidepanel/queries/modelProvider"

export function getProviderFromOpenAIType(
  provider: OpenAIModelProvider,
  type: ModelProvider["type"],
): ModelProvider {
  if (type === "openai") {
    return provider
  }

  if (type === "openrouter") {
    return {
      ...provider,
      type: "openrouter",
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
