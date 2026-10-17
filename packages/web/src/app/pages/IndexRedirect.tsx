import { Navigate } from "react-router"

import { useWorkspaceGet } from "../../queries/workspace"
import { paths } from "../../shared/routes"
import { Loader } from "../components/Loader"
import { useStore } from "../store"
import s from "./pages.module.css"

/**
 * Entry route: reopens the last workspace and chat, or the welcome screen when
 * there are no workspaces yet.
 */
export function IndexRedirect() {
  const { data: workspaces, isLoading } = useWorkspaceGet()
  const lastSelectedWorkspaceId = useStore(
    (state) => state.lastSelectedWorkspaceId,
  )

  if (isLoading || !workspaces) {
    return (
      <div className={s.loading}>
        <Loader size={20} />
      </div>
    )
  }

  const workspace =
    workspaces.find((item) => item.id === lastSelectedWorkspaceId) ??
    workspaces[0]

  if (!workspace) {
    return <Navigate replace to="/welcome" />
  }

  return (
    <Navigate
      replace
      to={paths.chat(workspace.id, workspace.lastSelectedChatId)}
    />
  )
}
