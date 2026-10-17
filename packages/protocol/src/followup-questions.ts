import type {
  FollowupAnswer,
  FollowupQuestion,
  FollowupQuestionItem,
} from "./entities"

import { skippedQuestionAnswer } from "./const"

/**
 * Questions of a follow-up question, converting the older single-question
 * format (question + suggestions) into one single-choice question.
 */
export function getFollowupQuestionItems(
  question: FollowupQuestion,
): FollowupQuestionItem[] {
  if (question.questions && question.questions.length > 0) {
    return question.questions
  }

  return [
    {
      header: "Question",
      multiple: false,
      options: question.followUp.map((suggestion) => ({
        label: suggestion.text,
      })),
      question: question.question,
    },
  ]
}

/** Answer of one question as plain text for the model. */
export function formatFollowupAnswer(answer: FollowupAnswer) {
  if (answer.skipped) {
    return skippedQuestionAnswer
  }

  return [answer.selected.join("; "), answer.text?.trim()]
    .filter(Boolean)
    .join(answer.selected.length > 0 ? ". Note: " : "")
}

/**
 * Text sent to the model for the answers of a question form. A single
 * question is answered with its answer only; several are numbered.
 */
export function formatFollowupAnswers(answers: FollowupAnswer[]) {
  if (answers.length === 1) {
    return formatFollowupAnswer(answers[0])
  }

  return answers
    .map(
      (answer, index) =>
        `${index + 1}. ${answer.question}\n${formatFollowupAnswer(answer)}`,
    )
    .join("\n\n")
}
