import { LightbulbIcon } from "lucide-react"
import { useId } from "react"

import { SegmentedControl } from "../../../../../../../SegmentedControl"
import { Toggle } from "../../../../../../../Toggle"
import { formatLevel, getModelDisplayName } from "../../utils"
import s from "./ReasoningPanel.module.css"
import { type ReasoningPanelProps } from "./types"

/**
 * Reasoning control of the selected model: effort levels, or an on/off
 * "Thinking" switch for Ollama models. Renders nothing for other models.
 */
export function ReasoningPanel({
  effort,
  model,
  onEffortChange,
  onThinkingChange,
  provider,
  thinkingEnabled,
}: ReasoningPanelProps) {
  const toggleId = useId()
  const levels = model.reasoning?.supportedEfforts ?? []
  const name = getModelDisplayName(model.name)

  if (provider.type === "ollama") {
    return (
      <div className={s.reasoningPanel}>
        <div className={s.row}>
          <LightbulbIcon aria-hidden="true" className={s.icon} />
          <label className={s.title} htmlFor={toggleId}>
            Thinking
          </label>
          <Toggle
            aria-label="Thinking"
            checked={thinkingEnabled}
            data-testid="thinking-toggle"
            id={toggleId}
            onChange={(event) => onThinkingChange(event.target.checked)}
          />
        </div>
        <p className={s.hint}>
          {thinkingEnabled
            ? `${name} thinks before answering`
            : `${name} answers without thinking`}
        </p>
      </div>
    )
  }

  if (levels.length === 0) {
    return null
  }

  return (
    <div className={s.reasoningPanel}>
      <div className={s.row}>
        <LightbulbIcon aria-hidden="true" className={s.icon} />
        <span className={s.title}>Reasoning effort</span>
        <span className={s.model}>{name}</span>
      </div>
      <SegmentedControl
        fill
        aria-label="Reasoning effort"
        options={levels.map((level) => ({
          label: formatLevel(level),
          value: level,
        }))}
        value={
          effort && levels.includes(effort)
            ? effort
            : (model.reasoning?.defaultEffort ?? levels[0])
        }
        onChange={onEffortChange}
      />
    </div>
  )
}
