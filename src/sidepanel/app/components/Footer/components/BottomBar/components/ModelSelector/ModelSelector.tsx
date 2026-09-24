import { Input } from "@/sidepanel/app/components/Input"
import { Selector } from "@/sidepanel/app/components/Selector"
import { useChatMessageRunGet } from "@/sidepanel/queries/chat"
import { useModelProviderModelsGet } from "@/sidepanel/queries/modelProvider"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { footerActions, useFooterStore } from "../../../../store"
import { useLastMessageRunModel } from "./hooks/useLastMessageRunModel"
import {
  modelSelectorActions,
  useModelSelectorStore,
} from "./hooks/useModelSelectorStore"
import s from "./ModelSelector.module.css"
import { getSelectorOptions } from "./utils"

export function ModelSelector() {
  const collapsedGroupIds = useModelSelectorStore(
    (state) => state.collapsedGroupIds,
  )
  const searchQuery = useModelSelectorStore((state) => state.searchQuery)
  const selectedModelId = useFooterStore(
    (state): null | string => state.selectedModelId,
  )
  const currentWorkspace = useCurrentWorkspace()
  const selectedChatId = currentWorkspace?.lastSelectedChatId
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const {
    data: modelProviderGroups,
    error: modelProviderModelsError,
    isLoading,
  } = useModelProviderModelsGet()

  const { data: messageRuns } = useChatMessageRunGet(selectedChatId)

  useLastMessageRunModel(messageRuns, selectedChatId)

  const options = getSelectorOptions(
    modelProviderGroups,
    selectedModelId,
    searchQuery,
  )

  return (
    <Selector
      collapsibleGroups
      aria-label="Select model"
      className={s.selector}
      collapsedGroupIds={collapsedGroupIds}
      disabled={isLoading || (!normalizedSearchQuery && options.length === 0)}
      header={
        <Input
          data-selector-focus-on-open
          aria-label="Search models"
          autoComplete="off"
          autoCorrect="off"
          className={s.searchInput}
          placeholder="Search models"
          spellCheck={false}
          value={searchQuery}
          variant="transparent"
          onChange={(event) => {
            const nextSearchQuery = event.target.value

            if (
              nextSearchQuery.trim().toLowerCase() !== normalizedSearchQuery
            ) {
              modelSelectorActions.setCollapsedGroupIds([])
            }

            modelSelectorActions.setSearchQuery(nextSearchQuery)
          }}
        />
      }
      noOptionsMessage={
        modelProviderModelsError
          ? "Cannot load models"
          : searchQuery
            ? "No matching models"
            : "No models available"
      }
      options={options}
      placeholder="Select model"
      popoverClassName={s.selectorPopover}
      value={selectedModelId ?? undefined}
      variant="secondary"
      onCollapsedGroupIdsChange={modelSelectorActions.setCollapsedGroupIds}
      onValueChange={(value: string) => {
        footerActions.setSelectedModelId(value)
      }}
    />
  )
}
