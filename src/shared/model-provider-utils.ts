import type { ModelProvider } from "@/shared/api"

export function getModelProviderModelId(
  providerId: ModelProvider["id"],
  modelName: string,
): string {
  return `${providerId}::${modelName}`
}

export function parseModelProviderModelId(
  modelProviderModelId: null | string | undefined,
): {
  providerId?: ModelProvider["id"]
  modelName?: string
} {
  if (!modelProviderModelId) {
    return {}
  }

  const separatorIndex = modelProviderModelId.indexOf("::")
  if (separatorIndex === -1) {
    return {}
  }

  const providerId = modelProviderModelId.slice(0, separatorIndex).trim()
  const modelName = modelProviderModelId.slice(separatorIndex + 2).trim()

  if (!providerId || !modelName) {
    return {}
  }

  return { providerId, modelName }
}
