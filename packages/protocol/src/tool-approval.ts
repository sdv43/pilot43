import { toolApprovalAnswers } from "./const"

export type ToolApprovalDecision =
  (typeof toolApprovalAnswers)[keyof typeof toolApprovalAnswers]

/**
 * Answer for a tool approval that denies the call and tells the model why:
 * what the user typed in the message box while the call was waiting.
 */
export function encodeToolDenial(feedback: string) {
  const text = feedback.trim()

  return text
    ? `${toolApprovalAnswers.deny}\n${text}`
    : toolApprovalAnswers.deny
}

/**
 * Decision and optional feedback of a tool approval answer. Anything that is
 * not an allow answer counts as a denial.
 */
export function parseToolApprovalAnswer(answer: string): {
  decision: ToolApprovalDecision
  feedback?: string
} {
  const [first = "", ...rest] = answer.split("\n")
  const decision = first.trim()

  if (
    decision === toolApprovalAnswers.allowOnce ||
    decision === toolApprovalAnswers.alwaysAllow
  ) {
    return { decision }
  }

  const feedback = rest.join("\n").trim()

  return feedback
    ? { decision: toolApprovalAnswers.deny, feedback }
    : { decision: toolApprovalAnswers.deny }
}
