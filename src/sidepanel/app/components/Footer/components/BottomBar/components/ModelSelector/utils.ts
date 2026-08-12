import type { ModelProviderModels } from "@/sidepanel/queries/modelProvider"

import { parseModelProviderModelId } from "@/shared/model-provider-utils"

import type {
  SelectorEntry,
  SelectorOptionGroup,
} from "../../../../../Selector/types"

export function getSelectorOptions(
  modelProviderGroups: ModelProviderModels[] | undefined,
  selectedModelId: null | string,
  searchQuery?: string,
): SelectorEntry[] {
  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? ""

  const options: SelectorEntry[] = (modelProviderGroups ?? [])
    .filter((group) => group.error !== undefined || group.models.length > 0)
    .sort((left, right) =>
      left.provider.name.localeCompare(right.provider.name, undefined, {
        sensitivity: "base",
      }),
    )
    .map((group) => {
      const filteredModels = normalizedQuery
        ? group.models.filter((model) =>
            model.name.toLowerCase().includes(normalizedQuery),
          )
        : group.models

      return {
        id: group.provider.id,
        label: group.provider.name,
        options: [...filteredModels]
          .sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {
              sensitivity: "base",
            }),
          )
          .map((model: { id: string; name: string }) => ({
            label: model.name,
            title: model.name,
            value: model.id,
          })),
        error: group.error,
      }
    })
    .filter((group) => {
      if (!normalizedQuery) {
        return true
      }

      if (group.options.length > 0 || group.error !== undefined) {
        return true
      }

      return (
        typeof group.label === "string" &&
        group.label.toLowerCase().includes(normalizedQuery)
      )
    })

  if (
    selectedModelId &&
    !normalizedQuery &&
    !options.some((group) => {
      if ("options" in group) {
        return group.options.some((option) => option.value === selectedModelId)
      }
      return false
    })
  ) {
    const { providerId, modelName } = parseModelProviderModelId(selectedModelId)

    if (providerId && modelName) {
      const group = options?.find(
        (group) => "id" in group && group.id === providerId,
      ) as SelectorOptionGroup | undefined

      if (group) {
        group.options.unshift({
          label: modelName,
          title: modelName,
          value: selectedModelId,
          disabled: true,
        })
      } else {
        options.unshift({
          label: modelName,
          title: modelName,
          value: selectedModelId,
          disabled: true,
        })
      }
    }
  }

  return options
}
