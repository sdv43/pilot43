import type {
  ModelProviderCheckResult,
  ModelProviderModel,
  ModelReasoningCapability,
} from "@pilot43/protocol"

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
  provider: Pick<ModelProvider, "models" | "name" | "settings" | "type">,
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
): Promise<ModelProviderCheckResult> {
  try {
    const adapter = createModelAdapter(provider, "")
    const startedAt = performance.now()
    const models = await adapter.listModels()

    return {
      latencyMs: Math.round(performance.now() - startedAt),
      message: `Connected to "${provider.name}"`,
      models: models.map((model) => model.name),
      success: true,
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

    const models = providerModels.map((model) => {
      const reasoning = resolveModelReasoning(provider, model)

      return {
        id: getModelProviderModelId(providerId, model.id),
        name: model.name,
        providerId,
        ...(reasoning ? { reasoning } : {}),
      }
    })

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

/**
 * Reasoning levels of a model: the levels the user entered for it (providers
 * that do not report reasoning support) take precedence over the levels the
 * provider reports.
 */
export function resolveModelReasoning(
  provider: ModelProvider,
  model: { id: string; name: string; reasoning?: ModelReasoningCapability },
): ModelReasoningCapability | undefined {
  const configured = (
    provider.models?.[model.name] ?? provider.models?.[model.id]
  )?.reasoning

  if (configured) {
    if (configured.supportedEfforts.length === 0) {
      return undefined
    }

    return {
      defaultEffort: configured.supportedEfforts.includes(
        configured.defaultEffort ?? "",
      )
        ? configured.defaultEffort
        : configured.supportedEfforts[0],
      mandatory: false,
      supportedEfforts: configured.supportedEfforts,
    }
  }

  return model.reasoning
}
