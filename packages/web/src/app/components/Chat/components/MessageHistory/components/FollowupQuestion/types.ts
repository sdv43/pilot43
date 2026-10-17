import type { FollowupQuestion as FollowupQuestionData } from "@pilot43/protocol"

export interface FollowupQuestionProps {
  messageRunId: string
  question: FollowupQuestionData
}

/** Answer being edited for one question. */
export interface QuestionDraft {
  selected: string[]
  /** Free text ("Other" for single choice, "Anything else?" for multiple). */
  text: string
  /** Single choice: the "Other" option is chosen. */
  isOther: boolean
}
