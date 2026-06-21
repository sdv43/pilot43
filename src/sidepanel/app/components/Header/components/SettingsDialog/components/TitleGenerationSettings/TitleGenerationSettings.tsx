import { useEffect, useMemo, useState } from "react"

import type { SelectorEntry } from "@/sidepanel/app/components/Selector/types"

import {
  TITLE_GENERATION_DISABLED,
  TITLE_GENERATION_USE_CHAT_MODEL,
} from "@/shared/api"
import { parseModelProviderModelId } from "@/shared/model-provider-utils"
import { Loader } from "@/sidepanel/app/components/Loader"
import { Selector } from "@/sidepanel/app/components/Selector"
import { toast } from "@/sidepanel/app/components/ToastProvider"
import {
  useAppSettingsGet,
  useAppSettingsUpdate,
} from "@/sidepanel/queries/appSettings"
import { useModelProviderModelsGet } from "@/sidepanel/queries/modelProvider"

import s from "./TitleGenerationSettings.module.css"

const autosaveDelayMs = 1000

export function TitleGenerationSettings() {
  const { data: appSettings, isLoading } = useAppSettingsGet()

  if (isLoading || !appSettings) {
    return (
      <div className={s.container}>
        <div className={s.header}>
          <h3 className={s.title}>Title Generation</h3>
        </div>
        <div className={s.loading}>
          <Loader size={13} /> Loading...
        </div>
      </div>
    )
  }

  return (
    <TitleGenerationSettingsForm
      key={appSettings.id}
      initialValue={appSettings.titleGenerationModel}
    />
  )
}

interface TitleGenerationSettingsFormProps {
  initialValue: string
}

function TitleGenerationSettingsForm({
  initialValue,
}: TitleGenerationSettingsFormProps) {
  const { data: appSettings } = useAppSettingsGet()
  const updateMutation = useAppSettingsUpdate()
  const [value, setValue] = useState(initialValue)

  const handleSave = async (nextValue: string) => {
    if (!appSettings) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        ...appSettings,
        titleGenerationModel: nextValue,
      })
      toast("Title generation setting saved", "success")
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : "Failed to save title generation setting",
        "error",
      )
    }
  }

  // Debounced autosave: 1s after the user changes the selection.
  useEffect(() => {
    if (value === initialValue) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void handleSave(value)
    }, autosaveDelayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialValue])

  const options = useTitleGenerationSelectorOptions(value)

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h3 className={s.title}>Title Generation</h3>
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="titleGenerationModel">
          Model
        </label>
        <Selector
          aria-label="Select title generation model"
          className={s.selector}
          id="titleGenerationModel"
          name="titleGenerationModel"
          options={options}
          placeholder="Select model"
          popoverClassName={s.selectorPopover}
          value={value}
          variant="input"
          onValueChange={(nextValue) => setValue(nextValue)}
        />
        <p className={s.helpText}>
          Choose which model generates chat titles. "Use chat model" reuses the
          model replying to your message, while a specific model always
          generates titles. Disabled keeps the fallback title. Changes are saved
          automatically.
        </p>
      </div>
    </div>
  )
}

/**
 * Builds the selector entries for the title generation model setting:
 *   - "Disabled"
 *   - "Use chat model"
 *   - All currently available models, grouped by provider.
 *
 * If the persisted value no longer matches an available model, a disabled
 * placeholder option is injected so the current selection stays visible.
 */
function useTitleGenerationSelectorOptions(
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
      .filter((group) => group.models.length > 0)
      .map((group) => ({
        id: group.provider.id,
        label: group.provider.name,
        options: group.models.map((model) => ({
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
