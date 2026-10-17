import type { FollowupAnswer, FollowupQuestionItem } from "@pilot43/protocol"

import type { QuestionDraft } from "./types"

export function createQuestionDraft(): QuestionDraft {
  return { isOther: false, selected: [], text: "" }
}

export function isQuestionAnswered(draft: QuestionDraft) {
  return draft.selected.length > 0 || !!draft.text.trim()
}

/** Structured answer of one question; unanswered questions count as skipped. */
export function toFollowupAnswer(
  item: FollowupQuestionItem,
  draft: QuestionDraft,
  skipped: boolean,
): FollowupAnswer {
  const text = draft.text.trim()

  if (skipped || !isQuestionAnswered(draft)) {
    return {
      header: item.header,
      question: item.question,
      selected: [],
      skipped: true,
    }
  }

  return {
    header: item.header,
    question: item.question,
    selected: item.multiple || !draft.isOther ? draft.selected : [],
    ...(text && (item.multiple || draft.isOther) ? { text } : {}),
  }
}
