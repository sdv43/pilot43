import type { ModelProviderModelSettings } from "@pilot43/protocol"

import { getKnownContextWindow } from "@pilot43/protocol"

import type { ModelProvider } from "../../../../queries/modelProvider"

import { formatTokenCount } from "../../../../shared/format-tokens"
import { providerTypeLabels } from "../ProvidersSettings/const"

/** Smallest and largest context window the field accepts, in tokens. */
export const contextWindowLimits = { max: 100_000_000, min: 1000 }

export const defaultOllamaHost = "http://localhost:11434"

/** Where to get an API key, per provider type (Ollama needs none). */
export const apiKeyPages: Partial<Record<ModelProvider["type"], string>> = {
  openai: "https://platform.openai.com/api-keys",
  openrouter: "https://openrouter.ai/keys",
}

/** `?type=` of the Add provider URL, when it names a provider type. */
export function parseProviderType(
  value: null | string,
): ModelProvider["type"] | undefined {
  return value === "openai" || value === "openrouter" || value === "ollama"
    ? value
    : undefined
}

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

/**
 * Context window used in the chat for a model: the one entered, else the
 * known window of a well-known model.
 */
export function getModelContextWindow(
  modelName: string,
  settings: ModelProviderModelSettings | undefined,
) {
  return settings?.contextWindow ?? getKnownContextWindow(modelName)
}

/**
 * Summary of a model: `low, high · default high · 128k context`, or
 * `No reasoning · context unknown`.
 */
export function describeModel(
  modelName: string,
  settings: ModelProviderModelSettings | undefined,
) {
  const contextWindow = getModelContextWindow(modelName, settings)

  return `${describeModelLevels(settings)} · ${
    contextWindow
      ? `${formatTokenCount(contextWindow)} context`
      : "context unknown"
  }`
}

/**
 * Reads a context window typed by the user: `128000`, `128,000`, `128k` or
 * `1M`. `undefined` when empty, `null` when it is not a valid window.
 */
export function parseContextWindow(text: string): null | number | undefined {
  const compact = text
    .trim()
    .toLowerCase()
    .replace(/[\s,_]/g, "")

  if (!compact) {
    return undefined
  }

  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(compact)

  if (!match) {
    return null
  }

  const multiplier = { "": 1, k: 1000, m: 1_000_000 }[
    match[2] as "" | "k" | "m"
  ]
  const value = Math.round(Number(match[1]) * multiplier)

  return value >= contextWindowLimits.min && value <= contextWindowLimits.max
    ? value
    : null
}

/** Sets (or, with `undefined`, clears) the context window of one model. */
export function setModelContextWindow(
  models: ModelProvider["models"],
  modelName: string,
  contextWindow: number | undefined,
): NonNullable<ModelProvider["models"]> {
  const { contextWindow: _previous, ...rest } = models?.[modelName] ?? {}

  return {
    ...models,
    [modelName]: {
      ...rest,
      ...(contextWindow !== undefined ? { contextWindow } : {}),
    },
  }
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
      ...models?.[modelName],
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
