import type { ModelProviderModels } from "@/sidepanel/queries/modelProvider"

import { parseModelProviderModelId } from "@/shared/model-provider-utils"

import type {
  SelectorEntry,
  SelectorOptionGroup,
} from "../../../../../Selector/types"

export function getSelectorOptions(
  modelProviderGroups: ModelProviderModels[] | undefined,
  selectedModelId: null | string,
): SelectorEntry[] {
  const options: SelectorEntry[] = (modelProviderGroups ?? [])
    .filter((group) => group.models.length > 0)
    .map((group) => ({
      id: group.provider.id,
      label: group.provider.name,
      options: group.models.map((model: { id: string; name: string }) => ({
        label: model.name,
        value: model.id,
      })),
      error: group.error,
    }))

  if (
    selectedModelId &&
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
          value: selectedModelId,
          disabled: true,
        })
      } else {
        options.unshift({
          label: modelName,
          value: selectedModelId,
          disabled: true,
        })
      }
    }
  }

  return options
}
