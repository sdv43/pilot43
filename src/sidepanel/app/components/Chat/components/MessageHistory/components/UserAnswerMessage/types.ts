import type { ComponentPropsWithoutRef } from "react"

import type { MessageUserAnswer } from "@/shared/api/entities"

export interface UserAnswerMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageUserAnswer
}
