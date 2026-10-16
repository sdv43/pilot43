import { useStore } from "../app/store"
import { useWorkspaceGet } from "../queries/workspace"

export function useCurrentWorkspace() {
  const lastSelectedWorkspaceId = useStore(
    (state) => state.lastSelectedWorkspaceId,
  )
  const { data } = useWorkspaceGet()

  return data?.find((workspace) => workspace.id === lastSelectedWorkspaceId)
}
