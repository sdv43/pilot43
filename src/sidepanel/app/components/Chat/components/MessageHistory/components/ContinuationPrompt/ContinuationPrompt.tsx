import { continuationAnswerContinue } from "@/shared/const"
import { useChatMessageRunAnswer } from "@/sidepanel/queries/chat"
import { useChatMessageRunStop } from "@/sidepanel/queries/chat"
import { cn } from "@/sidepanel/shared/cn"

import s from "./ContinuationPrompt.module.css"
import { type ContinuationPromptProps } from "./types"

export function ContinuationPrompt({
  messageRunId,
  answered,
  className,
  ...props
}: ContinuationPromptProps) {
  const { isPending: isAnswerPending, mutate: answerRun } =
    useChatMessageRunAnswer()
  const { isPending: isStopPending, mutate: stopRun } = useChatMessageRunStop()

  const disabled = answered || isAnswerPending || isStopPending

  function handleContinue() {
    if (disabled) {
      return
    }
    answerRun(
      { answer: continuationAnswerContinue, messageRunId },
      {
        onError: (error) => {
          console.error("Failed to continue run:", error.message)
        },
      },
    )
  }

  function handleStop() {
    if (disabled) {
      return
    }
    stopRun(messageRunId, {
      onError: (error) => {
        console.error("Failed to stop run:", error.message)
      },
    })
  }

  return (
    <div
      {...props}
      className={cn(s.continuation, className)}
      data-testid="continuation-prompt"
    >
      {!answered ? (
        <>
          <div className={s.message}>
            The assistant has been working on its own for a while. Continue?
          </div>
          <div className={s.actions}>
            <button
              className={s.option}
              data-testid="continuation-prompt-continue"
              disabled={disabled}
              type="button"
              onClick={handleContinue}
            >
              Continue
            </button>
            <button
              className={s.option}
              data-testid="continuation-prompt-stop"
              disabled={disabled}
              type="button"
              onClick={handleStop}
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        <div className={s.answered} data-testid="continuation-prompt-answered">
          Resolved
        </div>
      )}
    </div>
  )
}
