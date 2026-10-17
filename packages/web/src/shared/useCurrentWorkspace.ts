import { useParams } from "react-router"

import { useStore } from "../app/store"
import { useWorkspaceGet } from "../queries/workspace"

/**
 * Id of the workspace shown on screen: the `:workspaceId` route param inside
 * chat routes, otherwise the last workspace the user opened.
 */
export function useCurrentWorkspaceId() {
  const { workspaceId } = useParams()
  const lastSelectedWorkspaceId = useStore(
    (state) => state.lastSelectedWorkspaceId,
  )

  return workspaceId ?? lastSelectedWorkspaceId
}

export function useCurrentWorkspace() {
  const workspaceId = useCurrentWorkspaceId()
  const { data } = useWorkspaceGet()

  return data?.find((workspace) => workspace.id === workspaceId)
}

/** Id of the open chat, or `null` for a new chat that has no messages yet. */
export function useCurrentChatId() {
  const { chatId } = useParams()

  return chatId ?? null
}
