import type { Workspace } from "@pilot43/protocol"

import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import { useWorkspaceGet } from "../../../../queries/workspace"
import { paths } from "../../../../shared/routes"
import { Button } from "../../../components/Button"
import { Card } from "../../../components/Card"
import { SectionHeader } from "../../../components/SectionHeader"
import { useStore } from "../../../store"
import { DeleteWorkspaceDialog } from "./components/DeleteWorkspaceDialog"
import { WorkspaceRow } from "./components/WorkspaceRow"
import s from "./WorkspacesSettings.module.css"

/** `/settings/workspaces` — list of workspaces. */
export function WorkspacesSettings() {
  const navigate = useNavigate()
  const { data: workspaces = [] } = useWorkspaceGet()
  const activeWorkspaceId = useStore((state) => state.lastSelectedWorkspaceId)
  const [deleting, setDeleting] = useState<null | Workspace>(null)

  return (
    <div className={s.workspacesSettings}>
      <p className={s.intro}>
        Each workspace keeps its own chats, system prompt, MCP servers and tool
        permissions.
      </p>
      <section aria-labelledby="settings-workspaces" className={s.section}>
        <SectionHeader
          action={
            <Button
              data-testid="new-workspace"
              icon={<PlusIcon />}
              size="small"
              variant="ghost"
              onClick={() => void navigate(paths.settingsNew("workspaces"))}
            >
              New workspace
            </Button>
          }
          id="settings-workspaces"
          title={`Workspaces · ${workspaces.length}`}
        />
        <Card>
          {workspaces.map((workspace) => (
            <WorkspaceRow
              key={workspace.id}
              isActive={workspace.id === activeWorkspaceId}
              workspace={workspace}
              onDelete={() => setDeleting(workspace)}
              onEdit={() =>
                void navigate(paths.settingsItem("workspaces", workspace.id))
              }
            />
          ))}
        </Card>
      </section>
      <DeleteWorkspaceDialog
        workspace={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
