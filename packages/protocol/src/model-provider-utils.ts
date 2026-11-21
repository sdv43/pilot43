import type { ModelProvider } from "./entities"

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

/**
 * Context windows of well-known model families, for providers that do not
 * report them (OpenAI-compatible APIs). Longest prefix wins.
 */
const knownContextWindows: [prefix: string, tokens: number][] = [
  ["claude", 200_000],
  ["gpt-3.5", 16_385],
  ["gpt-4.1", 1_047_576],
  ["gpt-4o", 128_000],
  ["gpt-4", 128_000],
  ["gpt-5", 400_000],
  ["o1", 200_000],
  ["o3", 200_000],
  ["o4", 200_000],
]

/** Context window of a model by name (`openai/gpt-5` → 400k), if known. */
export function getKnownContextWindow(name: string): number | undefined {
  const base = (
    name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name
  ).toLowerCase()

  return knownContextWindows
    .filter(([prefix]) => base.startsWith(prefix))
    .toSorted((a, b) => b[0].length - a[0].length)[0]?.[1]
}
