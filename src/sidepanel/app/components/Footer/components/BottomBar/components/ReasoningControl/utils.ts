import type { ModelReasoningCapability, ReasoningEffort } from "@/shared/api"
import type { SelectorEntry } from "@/sidepanel/app/components/Selector/types"

import { getSupportedReasoningEfforts } from "../../utils"
import { defaultReasoningOptionValue } from "./const"

function formatReasoningEffortLabel(effort: string): string {
  return effort.charAt(0).toUpperCase() + effort.slice(1).toLowerCase()
}

export function getReasoningEffortOptions(
  reasoning: ModelReasoningCapability,
): SelectorEntry[] {
  return [
    {
      label: "Default",
      value: defaultReasoningOptionValue,
    },
    ...getSupportedReasoningEfforts(reasoning).map((effort) => ({
      label: formatReasoningEffortLabel(effort),
      title: formatReasoningEffortLabel(effort),
      value: effort,
    })),
  ]
}

export function getReasoningEffortValue(
  reasoning: ModelReasoningCapability,
  selectedReasoningEffort: null | ReasoningEffort,
): string {
  if (
    selectedReasoningEffort &&
    getSupportedReasoningEfforts(reasoning).includes(selectedReasoningEffort)
  ) {
    return selectedReasoningEffort
  }

  return defaultReasoningOptionValue
}
