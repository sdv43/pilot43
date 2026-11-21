import { continuationAnswerContinue } from "@pilot43/protocol"
import { CirclePauseIcon, ClockIcon, TriangleAlertIcon } from "lucide-react"

import {
  useChatMessageRunAnswer,
  useChatMessageRunStop,
} from "../../../../../../../queries/chat"
import { Button } from "../../../../../Button"
import { ChatNotice } from "../../../../../ChatNotice"
import { toast } from "../../../../../ToastProvider"
import { useNow } from "../../hooks/useNow"
import { type ContinuationPromptProps } from "./types"
import { getRetryDetail } from "./utils"

/**
 * Notice of a paused run: after many tool calls in a row (Stop / Continue),
 * or a rate limit / overload that retries on its own with a countdown
 * (Retry now / Cancel).
 */
export function ContinuationPrompt({
  messageRunId,
  prompt,
}: ContinuationPromptProps) {
  const { isPending: isAnswerPending, mutate: answerRun } =
    useChatMessageRunAnswer()
  const { isPending: isStopPending, mutate: stopRun } = useChatMessageRunStop()
  const isRateLimit = prompt.kind === "rate_limit"
  const disabled = isAnswerPending || isStopPending
  const now = useNow(isRateLimit && prompt.retryAt !== undefined)
  const detail = isRateLimit ? getRetryDetail(prompt, now) : undefined

  const stop = () =>
    stopRun(messageRunId, {
      onError: (error) => {
        toast(`Failed to stop: ${error.message}`, "error")
      },
    })

  return (
    <ChatNotice
      actions={
        <>
          {isRateLimit ? null : (
            <Button
              data-testid="continuation-prompt-stop"
              disabled={disabled}
              size="small"
              variant="secondary"
              onClick={stop}
            >
              Stop
            </Button>
          )}
          <Button
            data-testid="continuation-prompt-continue"
            disabled={disabled}
            size="small"
            // "Retry now" sits on a warning tint, so it is secondary (Figma 05).
            variant={isRateLimit ? "secondary" : "primary"}
            onClick={() =>
              answerRun(
                { answer: continuationAnswerContinue, messageRunId },
                {
                  onError: (error) => {
                    toast(`Failed to continue: ${error.message}`, "error")
                  },
                },
              )
            }
          >
            {isRateLimit ? "Retry now" : "Continue"}
          </Button>
          {isRateLimit ? (
            <Button
              data-testid="continuation-prompt-stop"
              disabled={disabled}
              size="small"
              variant="ghost"
              onClick={stop}
            >
              Cancel
            </Button>
          ) : null}
        </>
      }
      data-testid="continuation-prompt"
      detail={detail}
      icon={
        !isRateLimit ? (
          <CirclePauseIcon />
        ) : prompt.message.includes("overloaded") ? (
          <TriangleAlertIcon />
        ) : (
          <ClockIcon />
        )
      }
      message={prompt.message}
      tone={isRateLimit ? "warning" : "action"}
    />
  )
}
