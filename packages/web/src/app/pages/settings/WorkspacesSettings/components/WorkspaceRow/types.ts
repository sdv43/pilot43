import type { Workspace } from "@pilot43/protocol"

export interface WorkspaceRowProps {
  isActive: boolean
  onDelete: () => void
  onEdit: () => void
  workspace: Workspace
}
