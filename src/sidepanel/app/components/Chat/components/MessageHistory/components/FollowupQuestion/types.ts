import type { ComponentPropsWithoutRef } from "react"

import type { FollowupQuestion as FollowupQuestionData } from "@/shared/api"

export interface FollowupQuestionProps extends ComponentPropsWithoutRef<"div"> {
  messageRunId: string
  question: FollowupQuestionData
  /** Whether the user has already answered this question. */
  answered?: boolean
}
