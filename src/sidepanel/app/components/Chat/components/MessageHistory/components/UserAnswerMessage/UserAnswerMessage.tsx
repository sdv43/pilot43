import { Markdown } from "@/sidepanel/app/components"
import { cn } from "@/sidepanel/shared/cn"

import { type UserAnswerMessageProps } from "./types"
import s from "./UserAnswerMessage.module.css"

export function UserAnswerMessage({
  message,
  className,
  ...props
}: UserAnswerMessageProps) {
  return (
    <div
      {...props}
      className={cn(s.userAnswerWrapper, className)}
      data-testid="user-answer-message"
    >
      <div className={s.userAnswer}>
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  )
}
