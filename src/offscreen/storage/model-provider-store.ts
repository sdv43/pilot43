import type { OllamaModelProvider, OpenAIModelProvider } from "@/shared/api"

import { defaultMaxRequestPerMinute } from "../handlers/const"
import { getDB } from "./db"

export type ModelProvider = OllamaModelProvider | OpenAIModelProvider

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

export async function getAllModelProviders(): Promise<ModelProvider[]> {
  const db = await getDB()
  return (await db.getAll("modelProviders")) as ModelProvider[]
}

export async function getModelProviderById(
  id: string,
): Promise<ModelProvider | undefined> {
  const db = await getDB()
  return (await db.get("modelProviders", id)) as ModelProvider | undefined
}

export async function createModelProvider(
  provider: Pick<
    ModelProvider,
    "maxRequestPerMinute" | "name" | "settings" | "type"
  >,
): Promise<ModelProvider> {
  const db = await getDB()
  const newProvider: ModelProvider =
    provider.type === "ollama"
      ? {
          id: crypto.randomUUID(),
          maxRequestPerMinute:
            provider.maxRequestPerMinute ?? defaultMaxRequestPerMinute,
          name: provider.name,
          type: "ollama",
          settings: provider.settings as OllamaModelProvider["settings"],
        }
      : {
          id: crypto.randomUUID(),
          maxRequestPerMinute:
            provider.maxRequestPerMinute ?? defaultMaxRequestPerMinute,
          name: provider.name,
          type: "openai",
          settings: provider.settings as OpenAIModelProvider["settings"],
        }

  await db.put("modelProviders", newProvider)
  return newProvider
}

export async function updateModelProvider(
  provider: ModelProvider,
): Promise<ModelProvider> {
  const db = await getDB()
  await db.put("modelProviders", provider)
  return provider
}

export async function deleteModelProvider(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("modelProviders", id)
}
