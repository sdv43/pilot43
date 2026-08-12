import type { ModelProviderModel } from "@/shared/api"

import { createModelAdapter } from "@/offscreen/models"
import { getModelProviderModelId } from "@/shared/model-provider-utils"

import {
  createModelProvider,
  deleteModelProvider,
  getAllModelProviders,
  type ModelProvider,
  updateModelProvider,
} from "../storage"

export function handleModelProviderTypeGet(): Promise<
  { type: ModelProvider["type"]; name: string }[]
> {
  return Promise.resolve([
    { type: "ollama", name: "Ollama" },
    { type: "openai", name: "OpenAI-compatible" },
    { type: "openrouter", name: "OpenRouter" },
  ])
}

export async function handleModelProviderGet(): Promise<ModelProvider[]> {
  return await getAllModelProviders()
}

export async function handleModelProviderCreate(
  provider: Pick<
    ModelProvider,
    "maxRequestPerMinute" | "name" | "settings" | "type"
  >,
): Promise<ModelProvider> {
  return await createModelProvider(provider)
}

export async function handleModelProviderUpdate(
  provider: ModelProvider,
): Promise<ModelProvider> {
  return await updateModelProvider(provider)
}

export async function handleModelProviderDelete(id: string): Promise<void> {
  await deleteModelProvider(id)
}

export async function handleModelProviderCheck(
  provider: ModelProvider,
): Promise<{ success: boolean; message: string }> {
  try {
    const adapter = createModelAdapter(provider, "")
    await adapter.listModels()
    return {
      success: true,
      message: `Successfully connected to "${provider.name}"`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function handleModelProviderModelGet(
  providerId: string,
): Promise<ModelProviderModel[]> {
  const providers = await getAllModelProviders()
  const provider = providers.find((p) => p.id === providerId)

  if (!provider) {
    throw new Error("Model provider not found")
  }

  try {
    const adapter = createModelAdapter(provider, "")
    const providerModels = await adapter.listModels()

    const models = providerModels.map((model) => ({
      id: getModelProviderModelId(providerId, model.id),
      name: model.name,
      providerId,
    }))

    const uniqueModelsMap = new Map<string, ModelProviderModel>()

    for (const model of models) {
      if (!uniqueModelsMap.has(model.id)) {
        uniqueModelsMap.set(model.id, model)
      }
    }

    return Array.from(uniqueModelsMap.values())
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    throw new Error(`Failed to fetch models: ${message}`, {
      cause: error,
    })
  }
}
