import type {
  FollowupQuestion,
  FollowupQuestionItem,
  FollowupQuestionOption,
} from "@pilot43/protocol"

import type { Tool } from "../types"

import { isPlainObject, requireStringArg } from "./shared"

const maxQuestions = 5
const maxOptions = 6

function parseJsonArray(value: unknown, key: string): unknown {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error(`If \`${key}\` is a JSON string, it must be an array.`)
  }
}

function parseOption(value: unknown, path: string): FollowupQuestionOption {
  if (typeof value === "string" && value.trim()) {
    return { label: value.trim() }
  }

  if (!isPlainObject(value)) {
    throw new Error(`\`${path}\` must be an object with a \`label\`.`)
  }

  const label = value.label ?? value.text

  if (typeof label !== "string" || !label.trim()) {
    throw new Error(`\`${path}.label\` must be a non-empty string.`)
  }

  return {
    label: label.trim(),
    ...(typeof value.description === "string" && value.description.trim()
      ? { description: value.description.trim() }
      : {}),
    ...(value.recommended === true ? { recommended: true } : {}),
  }
}

function parseQuestion(value: unknown, index: number): FollowupQuestionItem {
  const path = `questions[${index}]`

  if (!isPlainObject(value)) {
    throw new Error(`\`${path}\` must be an object.`)
  }

  const question = value.question

  if (typeof question !== "string" || !question.trim()) {
    throw new Error(`\`${path}.question\` must be a non-empty string.`)
  }

  const options = parseJsonArray(value.options ?? [], `${path}.options`)

  if (!Array.isArray(options) || options.length > maxOptions) {
    throw new Error(
      `\`${path}.options\` must be an array of at most ${maxOptions} options.`,
    )
  }

  const header =
    typeof value.header === "string" && value.header.trim()
      ? value.header.trim()
      : `Question ${index + 1}`

  return {
    header,
    multiple: value.multiple === true,
    options: options.map((option, optionIndex) =>
      parseOption(option, `${path}.options[${optionIndex}]`),
    ),
    question: question.trim(),
  }
}

/**
 * Parses the arguments of `ask_followup_question`. Accepts the structured
 * `questions` list and the older `question` + `follow_up` format, which
 * becomes a single single-choice question.
 */
export function parseAskFollowupQuestionArgs(
  args: Record<string, unknown>,
): FollowupQuestion {
  if (args.questions !== undefined) {
    const questions = parseJsonArray(args.questions, "questions")

    if (
      !Array.isArray(questions) ||
      questions.length < 1 ||
      questions.length > maxQuestions
    ) {
      throw new Error(
        `Parameter \`questions\` must contain between 1 and ${maxQuestions} questions.`,
      )
    }

    const items = questions.map(parseQuestion)

    return {
      followUp: items[0].options.map((option) => ({ text: option.label })),
      question: items[0].question,
      questions: items,
    }
  }

  const question = requireStringArg(args, "question")
  const followUp = parseJsonArray(args.follow_up ?? [], "follow_up")

  if (!Array.isArray(followUp) || followUp.length > 4) {
    throw new Error("Parameter `follow_up` must contain at most 4 items.")
  }

  return {
    followUp: followUp.map((item, index) => ({
      text: parseOption(item, `follow_up[${index}]`).label,
    })),
    question,
  }
}

export const askFollowupQuestionTool: Tool = {
  definition: {
    id: "ask_followup_question",
    name: "ask_followup_question",
    shortDescription: "Ask the user clarifying questions.",
    description:
      'Ask the user one or more questions to gather information you need instead of guessing. Generation pauses until the user answers; the answers are appended to the conversation, so do not restate them afterwards.\n\n`questions` is a list of 1-5 questions shown one per step. Each has a short `header` (1-3 words, e.g. "Branch"), the `question`, `options` (0-6 suggested answers as `{ "label", "description"?, "recommended"? }`; mark at most one as recommended) and `multiple` (true when several options may be picked). The user can always type their own answer or skip a question; a skipped question is answered with "The user skipped this question."\n\nExample:\n{ "questions": [{ "header": "Branch", "question": "Which branch should the PR target?", "multiple": false, "options": [{ "label": "main", "recommended": true }, { "label": "develop" }] }] }',
    hidden: true,
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      questions: {
        description:
          "List of 1-5 questions; each is { header, question, multiple, options: [{ label, description?, recommended? }] }",
        type: "object",
      },
    },
    required: ["questions"],
    type: "object",
  },
  // Generation pauses until the user answers, so questions must not overlap.
  execution: "sequential",
  // Arguments may arrive as JSON-encoded arrays or in the older format, which
  // the strict schema validation would reject.
  validateArgs: (args) => {
    parseAskFollowupQuestionArgs(args)
  },
  async execute(args, context) {
    const question = parseAskFollowupQuestionArgs(args)
    await context.askUser(question)
    return { awaitingInput: true, ok: true, question: question.question }
  },
}
