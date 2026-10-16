import type { ReasoningEffort } from "@pilot43/protocol"

import type { ReasoningControlProps } from "./types"

import { useChatMessageRunGet } from "../../../../../../../queries/chat"
import { useModelProviderModelsGet } from "../../../../../../../queries/modelProvider"
import { useCurrentWorkspace } from "../../../../../../../shared/useCurrentWorkspace"
import { Selector } from "../../../../../Selector"
import { footerActions, useFooterStore } from "../../../../store"
import { getModelProviderModel } from "../../utils"
import { defaultReasoningOptionValue } from "./const"
import { useLastMessageRunModelSettings } from "./hooks/useLastMessageRunModelSettings"
import s from "./ReasoningControl.module.css"
import { getReasoningEffortOptions, getReasoningEffortValue } from "./utils"

export function ReasoningControl(_props: ReasoningControlProps) {
  const selectedModelId = useFooterStore(
    (state): null | string => state.selectedModelId,
  )
  const selectedReasoningEffort = useFooterStore(
    (state): null | ReasoningEffort => state.selectedReasoningEffort,
  )
  const thinkingEnabled = useFooterStore((state) => state.thinkingEnabled)
  const currentWorkspace = useCurrentWorkspace()
  const selectedChatId = currentWorkspace?.lastSelectedChatId

  const { data: modelProviderGroups } = useModelProviderModelsGet()
  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)

  useLastMessageRunModelSettings(messageRuns, selectedChatId)

  const selectedModel = getModelProviderModel(
    modelProviderGroups,
    selectedModelId,
  )

  if (!selectedModel || selectedModel.provider.type === "openai") {
    return null
  }

  if (selectedModel.provider.type === "ollama") {
    return (
      <label className={s.reasoningControl}>
        <span className={s.toggle}>
          <input
            aria-label="Thinking"
            checked={thinkingEnabled}
            className={s.checkbox}
            data-testid="thinking-toggle"
            type="checkbox"
            onChange={(event) =>
              footerActions.setThinkingEnabled(event.target.checked)
            }
          />

          <span className={s.toggleLabel}>Thinking</span>
        </span>
      </label>
    )
  }

  if (!selectedModel.model.reasoning) {
    return null
  }

  const options = getReasoningEffortOptions(selectedModel.model.reasoning)

  if (options.length <= 1) {
    return null
  }

  return (
    <Selector
      aria-label="Select reasoning effort"
      className={s.selector}
      options={options}
      placeholder="Reasoning"
      popoverClassName={s.selectorPopover}
      value={getReasoningEffortValue(
        selectedModel.model.reasoning,
        selectedReasoningEffort,
      )}
      variant="secondary"
      onValueChange={(value: string) => {
        footerActions.setSelectedReasoningEffort(
          value === defaultReasoningOptionValue ? null : value,
        )
      }}
    />
  )
}
