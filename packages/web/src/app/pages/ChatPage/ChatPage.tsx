import { useEffect } from "react"
import { Navigate, useParams } from "react-router"

import { useChatGetByWorkspace } from "../../../queries/chat"
import { useWorkspaceGet, useWorkspaceUpdate } from "../../../queries/workspace"
import { paths } from "../../../shared/routes"
import { Chat, Footer } from "../../components"
import { ChatHeader } from "../../components/ChatHeader"
import { Loader } from "../../components/Loader"
import { actions } from "../../store"
import pageStyles from "../pages.module.css"
import s from "./ChatPage.module.css"

/** `/w/:workspaceId` (new chat) and `/w/:workspaceId/c/:chatId`. */
export function ChatPage() {
  const { chatId = null, workspaceId } = useParams()
  const { data: workspaces, isLoading } = useWorkspaceGet()
  const { data: chats, isFetching: isFetchingChats } =
    useChatGetByWorkspace(workspaceId)
  const { mutate: updateWorkspace } = useWorkspaceUpdate()
  const workspace = workspaces?.find((item) => item.id === workspaceId)
  // Wait for a refetch before treating the chat as deleted: a chat created by
  // the first message is opened before the chat list has been refreshed.
  const isUnknownChat =
    !!chatId &&
    !!chats &&
    !isFetchingChats &&
    !chats.some((chat) => chat.id === chatId)

  // Remember the open workspace and chat so the panel reopens on them.
  useEffect(() => {
    if (!workspace) {
      return
    }

    actions.setLastSelectedWorkspaceId(workspace.id)

    if (workspace.lastSelectedChatId !== chatId && !isUnknownChat) {
      updateWorkspace({ ...workspace, lastSelectedChatId: chatId })
    }
  }, [workspace, chatId, isUnknownChat, updateWorkspace])

  if (isLoading) {
    return (
      <div className={pageStyles.loading}>
        <Loader size={20} />
      </div>
    )
  }

  if (!workspace) {
    return <Navigate replace to={paths.home()} />
  }

  if (isUnknownChat) {
    return <Navigate replace to={paths.chat(workspace.id)} />
  }

  return (
    <div className={s.page}>
      <ChatHeader />
      <Chat className={s.chat} />
      <Footer className={s.footer} />
    </div>
  )
}
