import {
  providerTypeInitials,
  providerTypeLabels,
} from "../../../ProvidersSettings/const"
import { providerTypes } from "./const"
import s from "./ProviderTypePicker.module.css"
import { type ProviderTypePickerProps } from "./types"

export function ProviderTypePicker({
  disabled = false,
  onChange,
  value,
}: ProviderTypePickerProps) {
  return (
    <div
      aria-label="Provider"
      className={s.providerTypePicker}
      role="radiogroup"
    >
      {providerTypes.map((type) => (
        <button
          key={type}
          aria-checked={type === value}
          className={s.option}
          data-testid={`provider-type-${type}`}
          disabled={disabled && type !== value}
          role="radio"
          type="button"
          onClick={() => onChange(type)}
        >
          <span aria-hidden="true" className={s.initial}>
            {providerTypeInitials[type]}
          </span>
          {providerTypeLabels[type]}
        </button>
      ))}
    </div>
  )
}
