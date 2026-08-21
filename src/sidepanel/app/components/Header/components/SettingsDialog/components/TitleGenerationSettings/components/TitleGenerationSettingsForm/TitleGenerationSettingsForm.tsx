import { useEffect, useState } from "react"

import { Selector } from "@/sidepanel/app/components/Selector"
import { toast } from "@/sidepanel/app/components/ToastProvider"
import {
  useAppSettingsGet,
  useAppSettingsUpdate,
} from "@/sidepanel/queries/appSettings"

import { autosaveDelayMs } from "../../const"
import s from "../../TitleGenerationSettings.module.css"
import { useTitleGenerationSelectorOptions } from "../../utils"

interface TitleGenerationSettingsFormProps {
  initialValue: string
}

export function TitleGenerationSettingsForm({
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
          generates titles. Disabled keeps the fallback title.
        </p>
      </div>
    </div>
  )
}
