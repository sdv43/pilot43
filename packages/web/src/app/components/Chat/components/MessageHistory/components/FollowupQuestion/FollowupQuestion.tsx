import {
  formatFollowupAnswers,
  getFollowupQuestionItems,
} from "@pilot43/protocol"
import { CheckIcon, MessageCircleQuestionIcon } from "lucide-react"
import { useId } from "react"

import { useChatMessageRunAnswer } from "../../../../../../../queries/chat"
import { Button } from "../../../../../Button"
import { toast } from "../../../../../ToastProvider"
import { QuestionStep } from "./components/QuestionStep"
import s from "./FollowupQuestion.module.css"
import { useQuestionForm } from "./hooks/useQuestionForm"
import { type FollowupQuestionProps } from "./types"
import { isQuestionAnswered, toFollowupAnswer } from "./utils"

/**
 * Questions the assistant is waiting on, one per step. Submitting sends all
 * answers at once; skipped questions are reported as skipped.
 */
export function FollowupQuestion({
  messageRunId,
  question,
}: FollowupQuestionProps) {
  const formId = useId()
  const items = getFollowupQuestionItems(question)
  const { drafts, markSkipped, setStep, skipped, step, updateDraft } =
    useQuestionForm(items)
  const { isPending, mutate: answerRun } = useChatMessageRunAnswer()
  const isLast = step === items.length - 1
  const item = items[step]

  function submit(skipCurrent: boolean) {
    const answers = items.map((entry, index) =>
      toFollowupAnswer(
        entry,
        drafts[index],
        skipped[index] || (skipCurrent && index === step),
      ),
    )

    answerRun(
      { answer: formatFollowupAnswers(answers), answers, messageRunId },
      {
        onError: (error) => {
          toast(`Failed to submit answers: ${error.message}`, "error")
        },
      },
    )
  }

  function next(skipCurrent: boolean) {
    if (skipCurrent) {
      markSkipped()
    }

    if (isLast) {
      submit(skipCurrent)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className={s.followupQuestion} data-testid="followup-question">
      <div className={s.header}>
        <MessageCircleQuestionIcon aria-hidden="true" className={s.icon} />
        <span className={s.title}>The assistant needs your input</span>
        {items.length > 1 ? (
          <span className={s.progress}>
            {step + 1} of {items.length}
          </span>
        ) : null}
      </div>

      {items.length > 1 ? (
        <div className={s.steps}>
          {items.map((entry, index) => {
            const state =
              index === step
                ? "current"
                : index < step &&
                    (skipped[index] || isQuestionAnswered(drafts[index]))
                  ? "done"
                  : "upcoming"

            return (
              <button
                key={`${entry.header}-${index}`}
                className={s.step}
                data-state={state}
                disabled={index > step}
                type="button"
                onClick={() => setStep(index)}
              >
                {state === "done" ? <CheckIcon aria-hidden="true" /> : null}
                {entry.header}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className={s.body}>
        <QuestionStep
          key={step}
          draft={drafts[step]}
          item={item}
          stepId={`${formId}-${step}`}
          onChange={updateDraft}
        />
      </div>

      <div className={s.footer}>
        <Button
          data-testid="followup-question-skip"
          disabled={isPending}
          size="small"
          variant="ghost"
          onClick={() => next(true)}
        >
          Skip
        </Button>
        <span className={s.spacer} />
        {step > 0 ? (
          <Button
            disabled={isPending}
            size="small"
            variant="secondary"
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
        ) : null}
        <Button
          data-testid="followup-question-submit"
          disabled={isPending || !isQuestionAnswered(drafts[step])}
          size="small"
          onClick={() => next(false)}
        >
          {isLast ? (items.length > 1 ? "Submit answers" : "Submit") : "Next"}
        </Button>
      </div>
    </div>
  )
}
