import type { FollowupQuestionItem } from "@pilot43/protocol"

import type { QuestionDraft } from "../../types"

export interface QuestionStepProps {
  draft: QuestionDraft
  item: FollowupQuestionItem
  onChange: (patch: Partial<QuestionDraft>) => void
  stepId: string
}
