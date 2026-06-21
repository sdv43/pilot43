import type { ComponentPropsWithoutRef } from "react"

import type { MessageUser } from "@/shared/api/entities"

export interface UserMessageProps extends ComponentPropsWithoutRef<"div"> {
  message: MessageUser
  isRetrying?: boolean
  onRetry?: () => void
}
