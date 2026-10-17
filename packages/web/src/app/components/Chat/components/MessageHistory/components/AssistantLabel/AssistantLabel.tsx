import { SparkleIcon } from "lucide-react"

import s from "./AssistantLabel.module.css"
import { type AssistantLabelProps } from "./types"

export function AssistantLabel({ modelName }: AssistantLabelProps) {
  return (
    <div className={s.assistantLabel} data-testid="assistant-label">
      <span aria-hidden="true" className={s.mark}>
        <SparkleIcon />
      </span>
      <span className={s.name}>Assistant</span>
      {modelName ? (
        <span className={s.model} data-testid="assistant-message-model">
          {modelName}
        </span>
      ) : null}
    </div>
  )
}
