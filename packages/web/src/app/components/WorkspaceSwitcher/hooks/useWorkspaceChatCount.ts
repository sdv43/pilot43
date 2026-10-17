import type { Workspace } from "@pilot43/protocol"

import { useChatGetByWorkspace } from "../../../../queries/chat"

/** Number of chats in a workspace, `undefined` while loading. */
export function useWorkspaceChatCount(workspaceId: Workspace["id"]) {
  const { data } = useChatGetByWorkspace(workspaceId)

  return data?.length
}
