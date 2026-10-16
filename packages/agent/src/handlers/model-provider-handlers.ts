import type { ModelProviderModel } from "@pilot43/protocol"

import { getModelProviderModelId } from "@pilot43/protocol"

import type { AgentContext } from "../context"
import type { ModelProvider } from "../storage"

import { createModelAdapter } from "../models"

export function handleModelProviderTypeGet(): Promise<
  { type: ModelProvider["type"]; name: string }[]
> {
  return Promise.resolve([
    { type: "ollama", name: "Ollama" },
    { type: "openai", name: "OpenAI-compatible" },
    { type: "openrouter", name: "OpenRouter" },
  ])
}

export async function handleModelProviderGet(
  ctx: AgentContext,
): Promise<ModelProvider[]> {
  return await ctx.store.getAllModelProviders()
}

export async function handleModelProviderCreate(
  ctx: AgentContext,
  provider: Pick<
    ModelProvider,
    "maxRequestPerMinute" | "name" | "settings" | "type"
  >,
): Promise<ModelProvider> {
  return await ctx.store.createModelProvider(provider)
}

export async function handleModelProviderUpdate(
  ctx: AgentContext,
  provider: ModelProvider,
): Promise<ModelProvider> {
  return await ctx.store.updateModelProvider(provider)
}

export async function handleModelProviderDelete(
  ctx: AgentContext,
  id: string,
): Promise<void> {
  await ctx.store.deleteModelProvider(id)
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
  ctx: AgentContext,
  providerId: string,
): Promise<ModelProviderModel[]> {
  const providers = await ctx.store.getAllModelProviders()
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
      ...(model.reasoning ? { reasoning: model.reasoning } : {}),
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
