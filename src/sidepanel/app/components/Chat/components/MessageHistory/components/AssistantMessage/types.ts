import type { ComponentPropsWithoutRef } from "react"

import type { MessageAssistant } from "@/shared/api/entities"

export interface AssistantMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageAssistant
  modelName: string
}
