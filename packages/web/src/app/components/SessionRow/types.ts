import type { Chat } from "@pilot43/protocol"

export interface SessionRowProps {
  chat: Chat
  className?: string
  isActive?: boolean
  isGenerating?: boolean
  onDelete: () => void
  onOpen: () => void
  onRename: () => void
  onTogglePin: () => void
  time?: string
}
