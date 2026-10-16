import type {
  OllamaModelProvider,
  OpenAIModelProvider,
  OpenRouterModelProvider,
} from "@pilot43/protocol"

import type { AgentStorage, ModelProvider } from "./types"

import { defaultMaxRequestPerMinute } from "../handlers/const"

/**
 * Resolves the effective per-minute request limit for a provider, falling back
 * to the default when the value is missing or invalid.
 */
export function getMaxRequestPerMinute(provider: ModelProvider): number {
  const value = provider.maxRequestPerMinute
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return defaultMaxRequestPerMinute
  }
  return Math.floor(value)
}

export function createModelProviderStore(storage: AgentStorage) {
  return {
    getAllModelProviders: (): Promise<ModelProvider[]> => {
      return storage.modelProviders.getAll()
    },

    getModelProviderById: (id: string): Promise<ModelProvider | undefined> => {
      return storage.modelProviders.getById(id)
    },

    createModelProvider: async (
      provider: Pick<
        ModelProvider,
        "maxRequestPerMinute" | "name" | "settings" | "type"
      >,
    ): Promise<ModelProvider> => {
      const baseProvider = {
        id: crypto.randomUUID(),
        maxRequestPerMinute:
          provider.maxRequestPerMinute ?? defaultMaxRequestPerMinute,
        name: provider.name,
      }

      let newProvider: ModelProvider

      if (provider.type === "ollama") {
        newProvider = {
          ...baseProvider,
          type: "ollama",
          settings: provider.settings as OllamaModelProvider["settings"],
        }
      } else if (provider.type === "openai") {
        newProvider = {
          ...baseProvider,
          type: "openai",
          settings: provider.settings as OpenAIModelProvider["settings"],
        }
      } else {
        newProvider = {
          ...baseProvider,
          type: "openrouter",
          settings: provider.settings as OpenRouterModelProvider["settings"],
        }
      }

      await storage.modelProviders.put(newProvider)
      return newProvider
    },

    updateModelProvider: async (
      provider: ModelProvider,
    ): Promise<ModelProvider> => {
      await storage.modelProviders.put(provider)
      return provider
    },

    deleteModelProvider: async (id: string): Promise<void> => {
      await storage.modelProviders.delete(id)
    },
  }
}
