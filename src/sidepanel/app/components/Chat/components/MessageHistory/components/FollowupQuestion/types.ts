import type { FollowupQuestion as FollowupQuestionData } from "@pilot43/protocol"
import type { ComponentPropsWithoutRef } from "react"

export interface FollowupQuestionProps extends ComponentPropsWithoutRef<"div"> {
  messageRunId: string
  question: FollowupQuestionData
  /** Whether the user has already answered this question. */
  answered?: boolean
}
