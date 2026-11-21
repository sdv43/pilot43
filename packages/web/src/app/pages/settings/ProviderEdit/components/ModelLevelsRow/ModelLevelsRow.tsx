import { ChevronDownIcon, ChevronRightIcon, LightbulbIcon } from "lucide-react"
import { useId, useState } from "react"

import { NumberField } from "../../../../../components/NumberField"
import { Select } from "../../../../../components/Select"
import { TagInput } from "../../../../../components/TagInput"
import {
  describeModel,
  getModelContextWindow,
  parseContextWindow,
} from "../../utils"
import s from "./ModelLevelsRow.module.css"
import { type ModelLevelsRowProps } from "./types"

/** One model with the reasoning levels it accepts and its context window. */
export function ModelLevelsRow({
  isExpanded,
  modelName,
  onChange,
  onContextWindowChange,
  onToggle,
  settings,
}: ModelLevelsRowProps) {
  const levels = settings?.reasoning?.supportedEfforts ?? []
  const hintId = useId()
  const [contextText, setContextText] = useState(
    settings?.contextWindow?.toLocaleString("en-US") ?? "",
  )
  const isContextInvalid = parseContextWindow(contextText) === null
  // A well-known model's window applies until the user enters another one.
  const knownContextWindow = getModelContextWindow(modelName, undefined)

  return (
    <div className={s.modelLevelsRow} data-testid="model-levels-row">
      <button
        aria-expanded={isExpanded}
        className={s.header}
        type="button"
        onClick={onToggle}
      >
        <span className={s.text}>
          <span className={s.name}>{modelName}</span>
          <span className={s.summary}>
            {describeModel(modelName, settings)}
          </span>
        </span>
        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </button>
      {isExpanded ? (
        <div className={s.editor}>
          <TagInput
            aria-label={`Reasoning levels of ${modelName}`}
            placeholder="Add a level, e.g. low"
            tags={levels}
            onChange={(next) => onChange(next)}
          />
          <p className={s.hint}>
            Press Enter to add. Use the exact value the API expects.
          </p>
          {levels.length > 0 ? (
            <div className={s.defaultRow}>
              <span className={s.defaultLabel}>Default level</span>
              <Select
                aria-label={`Default level of ${modelName}`}
                icon={<LightbulbIcon />}
                options={levels.map((level) => ({
                  label: level,
                  value: level,
                }))}
                value={settings?.reasoning?.defaultEffort ?? levels[0]}
                variant="chip"
                onChange={(event) => onChange(levels, event.target.value)}
              />
            </div>
          ) : null}
          <div className={s.defaultRow}>
            <span className={s.defaultLabel}>Context window</span>
            <NumberField
              aria-describedby={hintId}
              aria-label={`Context window of ${modelName}`}
              invalid={isContextInvalid}
              placeholder={
                knownContextWindow
                  ? knownContextWindow.toLocaleString("en-US")
                  : "e.g. 128000"
              }
              suffix="tokens"
              value={contextText}
              onChange={(event) => {
                const text = event.target.value
                const contextWindow = parseContextWindow(text)

                setContextText(text)

                if (contextWindow !== null) {
                  onContextWindowChange(contextWindow)
                }
              }}
            />
          </div>
          <p
            className={s.hint}
            data-invalid={isContextInvalid || undefined}
            id={hintId}
          >
            {isContextInvalid
              ? "Enter a number of tokens from 1,000, e.g. 128000 or 128k."
              : "In tokens, from the model’s docs. Leave empty if unknown: the chat then shows the token count only."}
          </p>
        </div>
      ) : null}
    </div>
  )
}
