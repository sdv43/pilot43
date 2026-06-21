import { useState } from "react"

import { Button } from "@/sidepanel/app/components/Button"
import { toast } from "@/sidepanel/app/components/ToastProvider"
import { useChatMessageRunAnswer } from "@/sidepanel/queries/chat"
import { cn } from "@/sidepanel/shared/cn"

import s from "./FollowupQuestion.module.css"
import { type FollowupQuestionProps } from "./types"

export function FollowupQuestion({
  messageRunId,
  question,
  answered,
  className,
  ...props
}: FollowupQuestionProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [customAnswer, setCustomAnswer] = useState("")

  const { isPending, mutate: answerRun } = useChatMessageRunAnswer()

  function submitAnswer(answer: string) {
    const trimmed = answer.trim()
    if (!trimmed) {
      return
    }

    answerRun(
      { answer: trimmed, messageRunId },
      {
        onError: (error) => {
          toast(`Failed to submit answer: ${error.message}`, "error")
        },
      },
    )
  }

  function handleOptionClick(text: string) {
    if (answered || isPending) {
      return
    }
    submitAnswer(text)
  }

  function handleCustomSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (answered || isPending) {
      return
    }
    submitAnswer(customAnswer)
  }

  return (
    <div
      {...props}
      className={cn(s.followup, className)}
      data-testid="followup-question"
    >
      <div className={s.question}>{question.question}</div>

      {!answered ? (
        <div className={s.options}>
          {question.followUp.map((suggestion) => (
            <button
              key={suggestion.text}
              className={s.option}
              data-testid="followup-question-option"
              disabled={isPending}
              type="button"
              onClick={() => handleOptionClick(suggestion.text)}
            >
              {suggestion.text}
            </button>
          ))}

          {!isCustomOpen ? (
            <button
              className={s.option}
              data-testid="followup-question-custom-toggle"
              disabled={isPending}
              type="button"
              onClick={() => setIsCustomOpen(true)}
            >
              Custom answer
            </button>
          ) : null}

          {isCustomOpen ? (
            <form className={s.customAnswer} onSubmit={handleCustomSubmit}>
              <input
                autoFocus
                className={s.customInput}
                data-testid="followup-question-custom-input"
                disabled={isPending}
                placeholder="Enter your answer"
                type="text"
                value={customAnswer}
                onChange={(event) => setCustomAnswer(event.target.value)}
              />
              <Button
                disabled={isPending || !customAnswer.trim()}
                type="submit"
                variant="secondary"
              >
                Send
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className={s.answered} data-testid="followup-question-answered">
          Answered
        </div>
      )}
    </div>
  )
}
