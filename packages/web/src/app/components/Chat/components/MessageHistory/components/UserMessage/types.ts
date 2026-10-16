import type { MessageUser } from "@pilot43/protocol"
import type { ComponentPropsWithoutRef } from "react"

export interface UserMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageUser
  isRetrying?: boolean
  onRetry?: () => void
}
