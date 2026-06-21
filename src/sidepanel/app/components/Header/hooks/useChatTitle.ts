import { useChatGetByWorkspace } from "@/sidepanel/queries/chat"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

export function useChatTitle() {
  const currentWorkspace = useCurrentWorkspace()
  const selectedChatId = currentWorkspace?.lastSelectedChatId
  const { data: chats } = useChatGetByWorkspace(currentWorkspace?.id)
  const chatTitle = chats?.find((chat) => chat.id === selectedChatId)?.title

  return chatTitle
}
