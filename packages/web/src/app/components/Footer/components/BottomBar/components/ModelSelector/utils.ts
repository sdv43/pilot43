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

/** Collapse key of the Favourites group in `collapsedModelProviderIds`. */
export const FAVORITES_GROUP_ID = "favorites"

/**
 * Starred models that still exist, in the order they were starred, with the
 * provider each belongs to.
 */
export function getFavoriteModels(
  groups: ModelProviderModels[] | undefined,
  favoriteIds: ModelProviderModel["id"][],
) {
  const byId = new Map(
    (groups ?? []).flatMap((group) =>
      group.models.map(
        (model) => [model.id, { model, provider: group.provider }] as const,
      ),
    ),
  )

  return favoriteIds.flatMap((id) => {
    const entry = byId.get(id)
    return entry ? [entry] : []
  })
}
