import {
  BotIcon,
  ChevronDownIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react"
import { useId, useRef, useState } from "react"
import { useNavigate } from "react-router"

import {
  useModelProviderGet,
  useModelProviderModelsGet,
} from "../../../../../../../queries/modelProvider"
import { paths } from "../../../../../../../shared/routes"
import { Popover } from "../../../../../Popover"
import { footerActions, useFooterStore } from "../../../../store"
import { getModelProviderModel } from "../../utils"
import { ModelOption } from "./components/ModelOption"
import { ReasoningPanel } from "./components/ReasoningPanel"
import s from "./ModelSelector.module.css"
import {
  filterModelGroups,
  getModelDetail,
  getModelDisplayName,
  getModelInitial,
} from "./utils"

/** Model chip of the composer and its picker. */
export function ModelSelector() {
  const popoverId = useId()
  const anchorName = `--model-selector-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedModelId = useFooterStore((state) => state.selectedModelId)
  const effort = useFooterStore((state) => state.selectedReasoningEffort)
  const thinkingEnabled = useFooterStore((state) => state.thinkingEnabled)
  const { data: providers, isLoading: isLoadingProviders } =
    useModelProviderGet({ throwOnError: false })
  const { data: groups, isLoading: isLoadingModels } =
    useModelProviderModelsGet()
  const isLoading = isLoadingProviders || isLoadingModels
  const selected = getModelProviderModel(groups, selectedModelId)
  const visibleGroups = filterModelGroups(groups, query)
  const hasProviders = (providers?.length ?? 0) > 0

  if (!isLoading && !hasProviders) {
    return (
      <button
        className={s.chip}
        type="button"
        onClick={() => void navigate(paths.settingsNew("providers"))}
      >
        <BotIcon aria-hidden="true" className={s.chipIcon} />
        <span className={s.chipLabel}>Add a provider</span>
      </button>
    )
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Select model"
        className={s.chip}
        disabled={isLoading}
        popoverTarget={popoverId}
        style={{ anchorName }}
        title={selected?.model.name}
        type="button"
      >
        <BotIcon aria-hidden="true" className={s.chipIcon} />
        <span className={s.chipLabel}>
          {selected ? getModelDisplayName(selected.model.name) : "Select model"}
        </span>
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>

      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        aria-label="Models"
        className={s.menu}
        id={popoverId}
        role="menu"
        onOpenChange={(open) => {
          setIsOpen(open)

          if (!open) {
            setQuery("")
          }
        }}
      >
        {isOpen ? (
          <>
            <label className={s.search}>
              <SearchIcon aria-hidden="true" />
              <input
                autoFocus
                aria-label="Search models"
                autoComplete="off"
                className={s.searchInput}
                placeholder="Search models"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className={s.groups}>
              {visibleGroups.map((group) => (
                <div key={group.provider.id} className={s.group} role="group">
                  <div className={s.groupLabel}>
                    <span>{group.provider.name}</span>
                    {group.error ? (
                      <span className={s.groupError}>
                        {group.provider.type === "ollama"
                          ? "Ollama offline"
                          : "Unavailable"}
                      </span>
                    ) : null}
                  </div>
                  {group.models.map((model) => (
                    <ModelOption
                      key={model.id}
                      detail={getModelDetail(model)}
                      hasReasoning={
                        !!model.reasoning?.supportedEfforts?.length ||
                        group.provider.type === "ollama"
                      }
                      initial={getModelInitial(model, group.provider.type)}
                      isSelected={model.id === selectedModelId}
                      name={getModelDisplayName(model.name)}
                      onSelect={() => {
                        footerActions.setSelectedModel(model.id, null)
                      }}
                    />
                  ))}
                </div>
              ))}
              {visibleGroups.length === 0 ? (
                <p className={s.empty}>
                  {query ? "No matching models" : "No models available"}
                </p>
              ) : null}
            </div>

            {selected ? (
              <ReasoningPanel
                effort={effort}
                model={selected.model}
                provider={selected.provider}
                thinkingEnabled={thinkingEnabled}
                onEffortChange={(next) =>
                  footerActions.setSelectedReasoningEffort(next)
                }
                onThinkingChange={footerActions.setThinkingEnabled}
              />
            ) : null}

            <button
              className={s.manage}
              type="button"
              onClick={() => {
                popoverRef.current?.hidePopover()
                void navigate(paths.settings("providers"))
              }}
            >
              <SettingsIcon aria-hidden="true" />
              Manage providers
            </button>
          </>
        ) : null}
      </Popover>
    </>
  )
}
