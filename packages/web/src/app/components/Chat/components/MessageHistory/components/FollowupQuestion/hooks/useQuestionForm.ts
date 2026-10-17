import type { FollowupQuestionItem } from "@pilot43/protocol"

import { useState } from "react"

import type { QuestionDraft } from "../types"

import { createQuestionDraft } from "../utils"

/** Step and per-question answers of the question form. */
export function useQuestionForm(items: FollowupQuestionItem[]) {
  const [step, setStep] = useState(0)
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() =>
    items.map(createQuestionDraft),
  )
  const [skipped, setSkipped] = useState<boolean[]>(() =>
    items.map(() => false),
  )

  function updateDraft(patch: Partial<QuestionDraft>) {
    setDrafts((current) =>
      current.map((draft, index) =>
        index === step ? { ...draft, ...patch } : draft,
      ),
    )
    setSkipped((current) =>
      current.map((value, index) => (index === step ? false : value)),
    )
  }

  function markSkipped() {
    setSkipped((current) =>
      current.map((value, index) => (index === step ? true : value)),
    )
  }

  return { drafts, markSkipped, setStep, skipped, step, updateDraft }
}
