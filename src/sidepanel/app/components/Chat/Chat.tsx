import { useState } from "react"

import { useWorkspaceGet } from "@/sidepanel/queries/workspace"

import { cn } from "../../../shared/cn"
import { useStore } from "../../store"
import { Button } from "../Button"
import { WorkspacesDialog } from "../Header/components/WorkspacesDialog"
import s from "./Chat.module.css"
import { MessageHistory } from "./components/MessageHistory"
import { type ChatProps } from "./types"

export function Chat({ className, ...props }: ChatProps) {
  const [isWorkspacesDialogOpen, setIsWorkspacesDialogOpen] = useState(false)

  const { data: workspaces } = useWorkspaceGet()
  const lastSelectedWorkspaceId = useStore((s) => s.lastSelectedWorkspaceId)

  return (
    <div
      {...props}
      aria-label="Chat history"
      className={cn(s.chat, className)}
      role="region"
    >
      {!lastSelectedWorkspaceId && (workspaces ?? []).length > 0 && (
        <div className={s.noWorkspaceSelected}>
          <p className={s.noWorkspaceSelectedText}>
            Please select a workspace to start chatting
          </p>
        </div>
      )}

      {(workspaces ?? []).length === 0 && (
        <div className={s.noWorkspaceSelected}>
          <p className={s.noWorkspaceSelectedText}>
            Please create a workspace to start chatting
          </p>
          <Button onClick={() => setIsWorkspacesDialogOpen(true)}>
            Manage workspaces
          </Button>

          <WorkspacesDialog
            open={isWorkspacesDialogOpen}
            onOpenChange={setIsWorkspacesDialogOpen}
          />
        </div>
      )}

      {lastSelectedWorkspaceId && (workspaces ?? []).length > 0 && (
        <MessageHistory />
      )}
    </div>
  )
}
