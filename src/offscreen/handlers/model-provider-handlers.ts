import { Ollama } from "ollama/browser"
import OpenAI from "openai"

import type {
  ModelProviderModel,
  OllamaModelProvider,
  OpenAIModelProvider,
} from "@/shared/api"

import {
  createModelProvider,
  deleteModelProvider,
  getAllModelProviders,
  type ModelProvider,
  updateModelProvider,
} from "../storage"

export function handleModelProviderTypeGet(): Promise<
  { type: "ollama" | "openai"; name: string }[]
> {
  return Promise.resolve([
    { type: "ollama", name: "Ollama" },
    { type: "openai", name: "OpenAI-compatible" },
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
  provider: OllamaModelProvider | OpenAIModelProvider,
): Promise<{ success: boolean; message: string }> {
  try {
    if (provider.type === "ollama") {
      const ollama = new Ollama({ host: provider.settings.host })
      await ollama.list()
      return { success: true, message: "Successfully connected to Ollama" }
    } else {
      const openai = new OpenAI({
        apiKey: provider.settings.apiKey,
        baseURL: provider.settings.host,
        dangerouslyAllowBrowser: true,
      })
      await openai.models.list()
      return { success: true, message: "Successfully connected to OpenAI" }
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
    let models: ModelProviderModel[] = []

    if (provider.type === "ollama") {
      const ollama = new Ollama({ host: provider.settings.host })
      const response = await ollama.list()
      models = response.models.map((model) => ({
        id: `${providerId}::${model.name}`,
        name: model.name,
        providerId,
      }))
    } else {
      const openai = new OpenAI({
        apiKey: provider.settings.apiKey,
        baseURL: provider.settings.host,
        dangerouslyAllowBrowser: true,
      })
      const response = await openai.models.list()
      models = response.data.map((model) => ({
        id: `${providerId}::${model.id}`,
        name: model.id,
        providerId,
      }))
    }

    const uniqueModelsMap = new Map<string, ModelProviderModel>()
    for (const model of models) {
      if (!uniqueModelsMap.has(model.id)) {
        uniqueModelsMap.set(model.id, model)
      }
    }

    return Array.from(uniqueModelsMap.values())
  } catch (error) {
    console.error("Error fetching models:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch models: ${message}`, {
      cause: error,
    })
  }
}
