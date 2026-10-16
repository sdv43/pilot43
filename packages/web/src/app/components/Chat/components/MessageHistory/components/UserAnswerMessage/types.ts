import type { MessageUserAnswer } from "@pilot43/protocol"
import type { ComponentPropsWithoutRef } from "react"

export interface UserAnswerMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageUserAnswer
}
