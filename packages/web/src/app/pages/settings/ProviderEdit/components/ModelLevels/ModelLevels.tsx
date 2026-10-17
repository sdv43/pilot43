import { useState } from "react"

import { Card } from "../../../../../components/Card"
import { setModelLevels } from "../../utils"
import { ModelLevelsRow } from "../ModelLevelsRow"
import { collapsedModelCount } from "./const"
import s from "./ModelLevels.module.css"
import { type ModelLevelsProps } from "./types"

/**
 * Reasoning levels per model, for providers that do not report them
 * (OpenAI-compatible APIs).
 */
export function ModelLevels({
  modelNames,
  models,
  onChange,
}: ModelLevelsProps) {
  const [expanded, setExpanded] = useState<null | string>(modelNames[0] ?? null)
  const [showAll, setShowAll] = useState(false)
  const visible = showAll
    ? modelNames
    : modelNames.slice(0, collapsedModelCount)

  return (
    <section aria-labelledby="provider-models" className={s.modelLevels}>
      <h3 className={s.title} id="provider-models">
        Models · {modelNames.length}
      </h3>
      <p className={s.description}>
        Enter the reasoning levels each model accepts, exactly as the API names
        them. They are offered in the chat’s model picker; models without levels
        have no reasoning control.
      </p>
      <Card>
        {visible.map((modelName) => (
          <ModelLevelsRow
            key={modelName}
            isExpanded={expanded === modelName}
            modelName={modelName}
            settings={models?.[modelName]}
            onChange={(levels, defaultLevel) =>
              onChange(setModelLevels(models, modelName, levels, defaultLevel))
            }
            onToggle={() =>
              setExpanded((current) =>
                current === modelName ? null : modelName,
              )
            }
          />
        ))}
        {modelNames.length > collapsedModelCount ? (
          <button
            className={s.more}
            type="button"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll
              ? "Show fewer models"
              : `Show all ${modelNames.length} models`}
          </button>
        ) : null}
      </Card>
    </section>
  )
}
