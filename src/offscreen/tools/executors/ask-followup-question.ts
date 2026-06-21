import { isPlainObject, requireStringArg } from "./shared"

/**
 * Names of the interactive tools whose execution is driven by the streaming
 * loop rather than the generic {@link executeToolCalls} executor, because they
 * need access to the message run (to persist UI state) and may need to pause
 * generation while waiting for user input.
 */
export const askFollowupQuestionToolName = "ask_followup_question"

/**
 * Parses and validates the arguments for `ask_followup_question`, returning the
 * question text and the normalized list of suggested follow-up answers.
 */
export function parseAskFollowupQuestionArgs(args: Record<string, unknown>): {
  question: string
  followUp: { text: string }[]
} {
  const question = requireStringArg(args, "question")

  let followUpRaw = args.follow_up

  if (typeof followUpRaw === "string") {
    try {
      const parsed = JSON.parse(followUpRaw) as unknown[]
      if (Array.isArray(parsed)) {
        followUpRaw = parsed
      } else {
        throw new Error("Parameter `follow_up` must be an array.")
      }
    } catch {
      throw new Error("if `follow_up` is a JSON string, it must be an array.")
    }
  }

  if (!Array.isArray(followUpRaw)) {
    throw new Error("Parameter `follow_up` must be an array.")
  }

  if (followUpRaw.length < 1 || followUpRaw.length > 4) {
    throw new Error("Parameter `follow_up` must contain between 1 and 4 items.")
  }

  const followUp = followUpRaw.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`Parameter \`follow_up[${index}]\` must be an object.`)
    }

    const text = item.text
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(
        `Parameter \`follow_up[${index}].text\` must be a non-empty string.`,
      )
    }

    return { text }
  })

  return { followUp, question }
}
