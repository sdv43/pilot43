import type { ModelReasoningCapability, ReasoningEffort } from "@/shared/api"
import type { SelectorEntry } from "@/sidepanel/app/components/Selector/types"

import { getSupportedReasoningEfforts } from "../../utils"
import { defaultReasoningOptionValue } from "./const"

export function getReasoningEffortOptions(
  reasoning: ModelReasoningCapability,
): SelectorEntry[] {
  return [
    {
      label: "Default",
      value: defaultReasoningOptionValue,
    },
    ...getSupportedReasoningEfforts(reasoning).map((effort) => ({
      label: effort,
      title: effort,
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
