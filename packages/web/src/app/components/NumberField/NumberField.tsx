import type { NumberFieldProps } from "./types"

import { cn } from "../../../shared/cn"
import { Input } from "../Input"
import s from "./NumberField.module.css"

/** Compact number input with a unit suffix ("400,000 tokens"). */
export function NumberField({
  className,
  invalid,
  suffix,
  ...props
}: NumberFieldProps) {
  return (
    <span
      className={cn(s.numberField, className)}
      data-invalid={invalid || undefined}
    >
      <Input
        {...props}
        className={s.input}
        inputMode="numeric"
        invalid={invalid}
        type="text"
        variant="transparent"
      />
      {suffix ? <span className={s.suffix}>{suffix}</span> : null}
    </span>
  )
}
