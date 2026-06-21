import type { Chat } from "@/shared/api"

export interface ChatListItemProps {
  chat: Chat
  className?: string
  expanded?: boolean
}
