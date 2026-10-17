import { Checkbox } from "../../../../../../../Checkbox"
import { Radio } from "../../../../../../../Radio"
import s from "./QuestionOption.module.css"
import { type QuestionOptionProps } from "./types"

/** Selectable answer card of the question form. */
export function QuestionOption({
  checked,
  children,
  description,
  label,
  name,
  onChange,
  recommended = false,
  type,
}: QuestionOptionProps) {
  return (
    <div className={s.questionOption} data-checked={checked}>
      <label className={s.label} data-testid="followup-question-option">
        {type === "radio" ? (
          <Radio checked={checked} name={name} onChange={onChange} />
        ) : (
          <Checkbox checked={checked} name={name} onChange={onChange} />
        )}
        <span className={s.text}>
          <span className={s.title}>
            {label}
            {recommended ? (
              <span className={s.recommended}>Recommended</span>
            ) : null}
          </span>
          {description ? (
            <span className={s.description}>{description}</span>
          ) : null}
        </span>
      </label>
      {children}
    </div>
  )
}
