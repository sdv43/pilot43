import type { MessageUser } from "@pilot43/protocol"

export interface UserMessageProps {
  /** Later replies are replaced by an edit (more than one: plural copy). */
  hasLaterRuns?: boolean
  isRetrying?: boolean
  message: MessageUser
  /** Sends the edited text; the chat reruns from this message. */
  onEdit?: (content: string) => void
  onRetry?: () => void
}
