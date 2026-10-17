import { continuationAnswerContinue } from "@pilot43/protocol"
import { CirclePauseIcon, ClockIcon } from "lucide-react"

import {
  useChatMessageRunAnswer,
  useChatMessageRunStop,
} from "../../../../../../../queries/chat"
import { Button } from "../../../../../Button"
import { ChatNotice } from "../../../../../ChatNotice"
import { toast } from "../../../../../ToastProvider"
import { type ContinuationPromptProps } from "./types"

/**
 * Notice of a paused run: after many tool calls in a row (Stop / Continue)
 * or a provider rate limit (Continue retries the request).
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
              onClick={() =>
                stopRun(messageRunId, {
                  onError: (error) => {
                    toast(`Failed to stop: ${error.message}`, "error")
                  },
                })
              }
            >
              Stop
            </Button>
          )}
          <Button
            data-testid="continuation-prompt-continue"
            disabled={disabled}
            size="small"
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
            Continue
          </Button>
        </>
      }
      data-testid="continuation-prompt"
      icon={isRateLimit ? <ClockIcon /> : <CirclePauseIcon />}
      message={prompt.message}
      tone={isRateLimit ? "warning" : "neutral"}
    />
  )
}
