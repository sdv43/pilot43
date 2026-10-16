import type { MessageAssistant } from "@pilot43/protocol"
import type { ComponentPropsWithoutRef } from "react"

export interface AssistantMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageAssistant
}
