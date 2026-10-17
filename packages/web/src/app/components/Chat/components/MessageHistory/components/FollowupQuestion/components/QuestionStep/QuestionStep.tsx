import { Field } from "../../../../../../../Field"
import { Input } from "../../../../../../../Input"
import { Textarea } from "../../../../../../../Textarea"
import { answerTextMaxLength } from "../../const"
import { QuestionOption } from "../QuestionOption"
import s from "./QuestionStep.module.css"
import { type QuestionStepProps } from "./types"

/** One question of the form with its options and free-text answer. */
export function QuestionStep({
  draft,
  item,
  onChange,
  stepId,
}: QuestionStepProps) {
  return (
    <div className={s.questionStep}>
      <div className={s.heading}>
        <h3 className={s.question}>{item.question}</h3>
        <span className={s.hint}>
          {item.multiple
            ? "Pick any"
            : item.options.length > 0
              ? "Pick one"
              : "Type your answer"}
        </span>
      </div>
      <div className={s.options}>
        {item.options.map((option) => (
          <QuestionOption
            key={option.label}
            checked={
              draft.selected.includes(option.label) &&
              (item.multiple || !draft.isOther)
            }
            description={option.description}
            label={option.label}
            name={stepId}
            recommended={option.recommended}
            type={item.multiple ? "checkbox" : "radio"}
            onChange={() =>
              onChange(
                item.multiple
                  ? {
                      selected: draft.selected.includes(option.label)
                        ? draft.selected.filter(
                            (label) => label !== option.label,
                          )
                        : [...draft.selected, option.label],
                    }
                  : { isOther: false, selected: [option.label] },
              )
            }
          />
        ))}
        {!item.multiple && item.options.length > 0 ? (
          <QuestionOption
            checked={draft.isOther}
            description={draft.isOther ? undefined : "Type your own answer"}
            label="Other"
            name={stepId}
            type="radio"
            onChange={() => onChange({ isOther: true })}
          >
            {draft.isOther ? (
              <div className={s.other}>
                <Input
                  autoFocus
                  aria-label="Your answer"
                  data-testid="followup-question-custom-input"
                  maxLength={answerTextMaxLength}
                  placeholder="Type your own answer"
                  value={draft.text}
                  onChange={(event) => onChange({ text: event.target.value })}
                />
              </div>
            ) : null}
          </QuestionOption>
        ) : null}
      </div>
      {item.multiple || item.options.length === 0 ? (
        <Field
          label={
            item.options.length === 0
              ? "Your answer"
              : "Anything else? (optional)"
          }
          labelAction={
            <span className={s.counter}>
              {draft.text.length} / {answerTextMaxLength}
            </span>
          }
        >
          {(control) => (
            <Textarea
              {...control}
              className={s.text}
              data-testid="followup-question-custom-input"
              maxLength={answerTextMaxLength}
              value={draft.text}
              onChange={(event) => onChange({ text: event.target.value })}
            />
          )}
        </Field>
      ) : null}
    </div>
  )
}
