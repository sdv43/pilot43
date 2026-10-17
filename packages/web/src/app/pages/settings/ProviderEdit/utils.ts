import type { ModelProviderModelSettings } from "@pilot43/protocol"

import type { ModelProvider } from "../../../../queries/modelProvider"

import { providerTypeLabels } from "../ProvidersSettings/const"

export const defaultOllamaHost = "http://localhost:11434"

/** Provider with empty settings for the given type (new providers). */
export function createProviderDraft(
  type: ModelProvider["type"],
): ModelProvider {
  const name = providerTypeLabels[type]

  switch (type) {
    case "ollama":
      return { id: "", name, settings: { host: defaultOllamaHost }, type }
    case "openai":
      return { id: "", name, settings: { apiKey: "" }, type }
    case "openrouter":
      return { id: "", name, settings: { apiKey: "" }, type }
  }
}

/** Switches a draft to another type, keeping a custom name. */
export function changeProviderType(
  draft: ModelProvider,
  type: ModelProvider["type"],
): ModelProvider {
  const next = createProviderDraft(type)
  const hasCustomName = draft.name !== providerTypeLabels[draft.type]

  return hasCustomName ? { ...next, name: draft.name } : next
}

export function isProviderComplete(provider: ModelProvider) {
  if (!provider.name.trim()) {
    return false
  }

  return provider.type === "ollama"
    ? !!provider.settings.host.trim()
    : !!provider.settings.apiKey.trim()
}

/** Summary of a model's levels: `low, high · default high` or `No reasoning`. */
export function describeModelLevels(
  settings: ModelProviderModelSettings | undefined,
) {
  const levels = settings?.reasoning?.supportedEfforts ?? []

  if (levels.length === 0) {
    return "No reasoning"
  }

  const defaultLevel = settings?.reasoning?.defaultEffort

  return defaultLevel
    ? `${levels.join(", ")} · default ${defaultLevel}`
    : levels.join(", ")
}

/** Default level when none is chosen: `medium` if offered, else the first. */
function pickDefaultLevel(levels: string[]) {
  return levels.includes("medium") ? "medium" : (levels[0] ?? null)
}

/**
 * Sets the levels (and optionally the default) of one model. A default that
 * is no longer one of the levels is replaced.
 */
export function setModelLevels(
  models: ModelProvider["models"],
  modelName: string,
  levels: string[],
  defaultLevel?: null | string,
): NonNullable<ModelProvider["models"]> {
  const requested =
    defaultLevel !== undefined
      ? defaultLevel
      : (models?.[modelName]?.reasoning?.defaultEffort ?? null)

  return {
    ...models,
    [modelName]: {
      reasoning: {
        defaultEffort:
          requested && levels.includes(requested)
            ? requested
            : pickDefaultLevel(levels),
        supportedEfforts: levels,
      },
    },
  }
}
