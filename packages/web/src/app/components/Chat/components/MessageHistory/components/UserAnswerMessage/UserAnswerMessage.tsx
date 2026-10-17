import { formatFollowupAnswer } from "@pilot43/protocol"
import { CircleCheckIcon } from "lucide-react"

import { Markdown } from "../../../../../Markdown"
import { type UserAnswerMessageProps } from "./types"
import s from "./UserAnswerMessage.module.css"

/** The user's answers to the assistant's questions. */
export function UserAnswerMessage({ message }: UserAnswerMessageProps) {
  if (!message.answers || message.answers.length === 0) {
    return (
      <div className={s.userAnswerMessage} data-testid="user-answer-message">
        <div className={s.bubble}>
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    )
  }

  const answered = message.answers.filter((answer) => !answer.skipped).length

  return (
    <div className={s.answersCard} data-testid="user-answer-message">
      <div className={s.header}>
        <CircleCheckIcon aria-hidden="true" className={s.icon} />
        <span>
          {answered === 0
            ? "You skipped the questions"
            : `You answered ${answered} ${answered === 1 ? "question" : "questions"}`}
        </span>
      </div>
      <dl className={s.answers}>
        {message.answers.map((answer, index) => (
          <div key={`${answer.header}-${index}`} className={s.answer}>
            <dt className={s.question}>{answer.question}</dt>
            <dd className={s.value} data-skipped={!!answer.skipped}>
              {answer.skipped ? "Skipped" : formatFollowupAnswer(answer)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
