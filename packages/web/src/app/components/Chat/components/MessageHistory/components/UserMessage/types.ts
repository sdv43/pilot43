import type { MessageUser } from "@pilot43/protocol"

export interface UserMessageProps {
  isRetrying?: boolean
  message: MessageUser
  onRetry?: () => void
}
