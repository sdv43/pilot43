import { useId } from "react"

import { cn } from "../../../shared/cn"
import s from "./Field.module.css"
import { type FieldProps } from "./types"

/**
 * Label, control and helper/error text stacked as in the design's Text Field.
 * The control is rendered by `children`, which receives the ids needed to wire
 * up the label and description.
 */
export function Field({
  children,
  className,
  error,
  helper,
  label,
  labelAction,
}: FieldProps) {
  const id = useId()
  const descriptionId = `${id}-description`
  const description = error ?? helper

  return (
    <div className={cn(s.field, className)}>
      {label || labelAction ? (
        <div className={s.labelRow}>
          {label ? (
            <label className={s.label} htmlFor={id}>
              {label}
            </label>
          ) : null}
          {labelAction}
        </div>
      ) : null}
      {children({
        "aria-describedby": description ? descriptionId : undefined,
        "aria-invalid": error ? true : undefined,
        id,
      })}
      {description ? (
        <p
          className={s.description}
          data-error={!!error}
          id={descriptionId}
          role={error ? "alert" : undefined}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
