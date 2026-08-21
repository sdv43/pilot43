import { useMemo } from "react"

import type { SelectorEntry } from "@/sidepanel/app/components/Selector/types"

import {
  TITLE_GENERATION_DISABLED,
  TITLE_GENERATION_USE_CHAT_MODEL,
} from "@/shared/api"
import { parseModelProviderModelId } from "@/shared/model-provider-utils"
import { useModelProviderModelsGet } from "@/sidepanel/queries/modelProvider"

/**
 * Builds the selector entries for the title generation model setting:
 *   - "Disabled"
 *   - "Use chat model"
 *   - All currently available models, plus provider loading errors, grouped by provider.
 *
 * If the persisted value no longer matches an available model, a disabled
 * placeholder option is injected so the current selection stays visible.
 */
export function useTitleGenerationSelectorOptions(
  selectedValue: string,
): SelectorEntry[] {
  const { data: modelProviderGroups = [] } = useModelProviderModelsGet()

  return useMemo(() => {
    const baseOptions: SelectorEntry[] = [
      {
        label: "Disabled",
        value: TITLE_GENERATION_DISABLED,
      },
      {
        label: "Use chat model",
        value: TITLE_GENERATION_USE_CHAT_MODEL,
      },
    ]

    const modelOptions: SelectorEntry[] = modelProviderGroups
      .filter((group) => group.error !== undefined || group.models.length > 0)
      .sort((left, right) =>
        left.provider.name.localeCompare(right.provider.name, undefined, {
          sensitivity: "base",
        }),
      )
      .map((group) => ({
        id: group.provider.id,
        label: group.provider.name,
        options: [...group.models]
          .sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {
              sensitivity: "base",
            }),
          )
          .map((model) => ({
            label: model.name,
            value: model.id,
          })),
        error: group.error,
      }))

    const options = [...baseOptions, ...modelOptions]

    const isKnownOption = options.some((entry) => {
      if ("options" in entry) {
        return entry.options.some((option) => option.value === selectedValue)
      }

      return entry.value === selectedValue
    })

    if (
      selectedValue &&
      selectedValue !== TITLE_GENERATION_DISABLED &&
      selectedValue !== TITLE_GENERATION_USE_CHAT_MODEL &&
      !isKnownOption
    ) {
      const { modelName } = parseModelProviderModelId(selectedValue)
      const resolvedModelName = modelName ?? selectedValue

      options.push({
        disabled: true,
        label: `${resolvedModelName} (unavailable)`,
        value: selectedValue,
      })
    }

    return options
  }, [modelProviderGroups, selectedValue])
}
