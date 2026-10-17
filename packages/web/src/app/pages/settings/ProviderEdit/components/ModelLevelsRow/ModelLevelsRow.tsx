import { ChevronDownIcon, ChevronRightIcon, LightbulbIcon } from "lucide-react"

import { Select } from "../../../../../components/Select"
import { TagInput } from "../../../../../components/TagInput"
import { describeModelLevels } from "../../utils"
import s from "./ModelLevelsRow.module.css"
import { type ModelLevelsRowProps } from "./types"

/** One model with the reasoning levels it accepts. */
export function ModelLevelsRow({
  isExpanded,
  modelName,
  onChange,
  onToggle,
  settings,
}: ModelLevelsRowProps) {
  const levels = settings?.reasoning?.supportedEfforts ?? []

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
          <span className={s.summary}>{describeModelLevels(settings)}</span>
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
        </div>
      ) : null}
    </div>
  )
}
