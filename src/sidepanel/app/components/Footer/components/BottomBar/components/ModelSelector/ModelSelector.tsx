import { Selector } from "@/sidepanel/app/components/Selector"
import { useChatMessageRunGet } from "@/sidepanel/queries/chat"
import { useModelProviderModelsGet } from "@/sidepanel/queries/modelProvider"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { footerActions, useFooterStore } from "../../../../store"
import { useLastMessageRunModel } from "./hooks/useLastMessageRunModel"
import s from "./ModelSelector.module.css"
import { getSelectorOptions } from "./utils"

export function ModelSelector() {
  const selectedModelId = useFooterStore(
    (state): null | string => state.selectedModelId,
  )
  const currentWorkspace = useCurrentWorkspace()
  const selectedChatId = currentWorkspace?.lastSelectedChatId

  const {
    data: modelProviderGroups,
    error: modelProviderModelsError,
    isLoading,
  } = useModelProviderModelsGet()

  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)

  useLastMessageRunModel(messageRuns, selectedChatId)

  const options = getSelectorOptions(modelProviderGroups, selectedModelId)

  return (
    <Selector
      aria-label="Select model"
      className={s.selector}
      disabled={isLoading || options.length === 0}
      noOptionsMessage={
        modelProviderModelsError ? "Cannot load models" : "No models available"
      }
      options={options}
      placeholder="Select model"
      popoverClassName={s.selectorPopover}
      value={selectedModelId ?? undefined}
      variant="input"
      onValueChange={(value: string) => {
        footerActions.setSelectedModelId(value)
      }}
    />
  )
}
