import type { ModelProviderModel } from "@pilot43/protocol"

import type { ModelProviderModels } from "../../../../../../../queries/modelProvider"

/**
 * Provider groups sorted by name with their models sorted and filtered by the
 * search query. Groups without matching models are dropped unless they failed
 * to load (so the error stays visible).
 */
export function filterModelGroups(
  groups: ModelProviderModels[] | undefined,
  query: string,
): ModelProviderModels[] {
  const normalized = query.trim().toLowerCase()

  return (groups ?? [])
    .map((group) => ({
      ...group,
      models: group.models
        .filter((model) => model.name.toLowerCase().includes(normalized))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter(
      (group) => group.models.length > 0 || (!normalized && !!group.error),
    )
    .toSorted((a, b) => a.provider.name.localeCompare(b.provider.name))
}

/** Display name: the part after a vendor prefix (`anthropic/claude-x`). */
export function getModelDisplayName(name: string) {
  return name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name
}

/** Secondary line of a model: the full id when it has a vendor prefix. */
export function getModelDetail(model: Pick<ModelProviderModel, "name">) {
  return model.name.includes("/") ? model.name : undefined
}

/** `low` → `Low`. */
export function formatLevel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

/** Letter of a model's tile: its vendor (`anthropic/…` → A) or provider. */
export function getModelInitial(
  model: Pick<ModelProviderModel, "name">,
  providerType: string,
) {
  if (model.name.includes("/")) {
    return model.name.charAt(0).toUpperCase()
  }

  return providerType === "ollama"
    ? "L"
    : providerType === "openrouter"
      ? "R"
      : "O"
}
