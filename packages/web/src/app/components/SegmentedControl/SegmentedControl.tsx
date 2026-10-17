import type { SegmentedControlProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./SegmentedControl.module.css"

export function SegmentedControl<Value extends string>({
  "aria-label": ariaLabel,
  className,
  fill = false,
  onChange,
  options,
  size = "default",
  value,
}: SegmentedControlProps<Value>) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(s.segmentedControl, className)}
      data-fill={fill}
      data-size={size}
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          key={option.value}
          aria-checked={option.value === value}
          className={s.option}
          role="radio"
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span className={s.label}>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
