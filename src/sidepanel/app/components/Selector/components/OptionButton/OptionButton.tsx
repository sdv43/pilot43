import { type KeyboardEvent } from "react"

import type { SelectorOption } from "../../types"

import s from "./OptionButton.module.css"

export interface OptionButtonProps {
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onSelect: (option: SelectorOption) => void
  option: SelectorOption
  selectedOption: SelectorOption | undefined
}

export function OptionButton({
  onKeyDown,
  onSelect,
  option,
  selectedOption,
}: OptionButtonProps) {
  const isSelected = option.value === selectedOption?.value

  return (
    <button
      aria-selected={isSelected}
      className={s.option}
      data-option="true"
      data-selected={isSelected}
      disabled={option.disabled}
      role="option"
      title={option.title}
      type="button"
      onClick={() => onSelect(option)}
      onKeyDown={onKeyDown}
    >
      <span className={s.optionLabel}>{option.label}</span>
    </button>
  )
}
