import type { Chat } from "@pilot43/protocol"

export interface RenameChatDialogProps {
  chat: Chat | null
  onClose: () => void
}
