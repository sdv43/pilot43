import type {
  ModelProvider,
  OpenAIModelProvider,
} from "@/sidepanel/queries/modelProvider"

import { defaultMaxRequestPerMinute } from "./const"

export function createDefaultProvider(): OpenAIModelProvider {
  return {
    id: "",
    maxRequestPerMinute: defaultMaxRequestPerMinute,
    name: "",
    type: "openai",
    settings: { apiKey: "" },
  }
}

export function isProviderComplete(provider: ModelProvider): boolean {
  if (!provider.name.trim()) {
    return false
  }

  if (provider.type === "ollama") {
    return Boolean(provider.settings.host.trim())
  }

  return Boolean(provider.settings.apiKey.trim())
}
