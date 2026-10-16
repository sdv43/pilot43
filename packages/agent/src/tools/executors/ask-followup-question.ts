import type { Tool } from "../types"

import { isPlainObject, requireStringArg } from "./shared"

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

export const askFollowupQuestionTool: Tool = {
  definition: {
    id: "ask_followup_question",
    name: "ask_followup_question",
    shortDescription: "Ask the user a clarifying question.",
    description:
      'Ask the user a question to gather additional information needed to complete the task. Use it when you need clarification or more details to proceed effectively rather than guessing. Generation pauses until the user answers, and the answer is appended to the conversation history, so do not restate it afterwards.\n\n`question` is a clear, specific question. `follow_up` is a list of 1-4 suggested complete, actionable answers (no placeholders); each item is an object `{ "text": "..." }`. The user may pick one or type their own, so the suggestions should cover the most likely useful answers.\n\nExample:\n{ "question": "What is the path to the config file?", "follow_up": [{ "text": "./src/config.json" }, { "text": "./config.json" }] }',
    hidden: true,
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      follow_up: {
        description:
          "Required list of 1-4 suggested responses; each suggestion must be a complete, actionable answer",
        type: "object",
      },
      question: {
        description:
          "Clear, specific question that captures the missing information you need",
        type: "string",
      },
    },
    required: ["question", "follow_up"],
    type: "object",
  },
  // Generation pauses until the user answers, so questions must not overlap.
  execution: "sequential",
  // `follow_up` may also arrive as a JSON-encoded array, which the strict
  // schema validation would reject.
  validateArgs: (args) => {
    parseAskFollowupQuestionArgs(args)
  },
  async execute(args, context) {
    const { followUp, question } = parseAskFollowupQuestionArgs(args)
    await context.askUser({ followUp, question })
    return { awaitingInput: true, ok: true, question }
  },
}
