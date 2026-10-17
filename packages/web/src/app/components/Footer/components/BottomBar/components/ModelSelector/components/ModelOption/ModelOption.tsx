import { CheckIcon, LightbulbIcon } from "lucide-react"

import s from "./ModelOption.module.css"
import { type ModelOptionProps } from "./types"

export function ModelOption({
  detail,
  hasReasoning,
  initial,
  isSelected,
  name,
  onSelect,
}: ModelOptionProps) {
  return (
    <button
      aria-checked={isSelected}
      className={s.modelOption}
      data-selected={isSelected}
      role="menuitemradio"
      title={detail ?? name}
      type="button"
      onClick={onSelect}
    >
      <span aria-hidden="true" className={s.initial}>
        {initial}
      </span>
      <span className={s.text}>
        <span className={s.name}>{name}</span>
        {detail ? <span className={s.detail}>{detail}</span> : null}
      </span>
      {hasReasoning ? (
        <LightbulbIcon aria-label="Supports reasoning" className={s.bulb} />
      ) : null}
      {isSelected ? <CheckIcon aria-hidden="true" className={s.check} /> : null}
    </button>
  )
}
