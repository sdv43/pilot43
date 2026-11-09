import { CheckIcon, ChevronRightIcon } from "lucide-react"

import s from "./ModelGroupHeader.module.css"
import { type ModelGroupHeaderProps } from "./types"

/** Provider row of the model picker; folds the provider's models away. */
export function ModelGroupHeader({
  count,
  error,
  isCollapsible,
  isCollapsed,
  name,
  selectedModelName,
  onToggle,
}: ModelGroupHeaderProps) {
  const content = (
    <>
      {isCollapsible ? (
        <ChevronRightIcon aria-hidden="true" className={s.chevron} />
      ) : null}
      <span className={s.name}>{name}</span>
      {count > 0 ? (
        <span className={s.count} title={`${count} models`}>
          {count}
        </span>
      ) : null}
      {selectedModelName ? (
        <span className={s.selected}>
          <CheckIcon aria-hidden="true" />
          <span className={s.selectedName}>{selectedModelName}</span>
        </span>
      ) : null}
      {error ? <span className={s.error}>{error}</span> : null}
    </>
  )

  if (!isCollapsible) {
    return <div className={s.header}>{content}</div>
  }

  return (
    <button
      aria-expanded={!isCollapsed}
      className={s.header}
      type="button"
      onClick={onToggle}
    >
      {content}
    </button>
  )
}
