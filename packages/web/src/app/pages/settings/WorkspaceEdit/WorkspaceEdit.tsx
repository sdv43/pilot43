import { Navigate, useParams } from "react-router"

import { useMcpServerGet } from "../../../../queries/mcpServer"
import { useWorkspaceGet } from "../../../../queries/workspace"
import { paths } from "../../../../shared/routes"
import { WorkspaceForm } from "./components/WorkspaceForm"

/** `/settings/workspaces/new` and `/settings/workspaces/:workspaceId`. */
export function WorkspaceEdit() {
  const { workspaceId } = useParams()
  const { data: workspaces } = useWorkspaceGet()
  const { data: servers } = useMcpServerGet()
  const isNew = !workspaceId
  const workspace = workspaces?.find((item) => item.id === workspaceId)

  if (!workspaces || !servers) {
    return null
  }

  if (!isNew && !workspace) {
    return <Navigate replace to={paths.settings("workspaces")} />
  }

  return (
    <WorkspaceForm
      key={workspace?.id ?? "new"}
      servers={servers}
      workspace={workspace}
    />
  )
}
