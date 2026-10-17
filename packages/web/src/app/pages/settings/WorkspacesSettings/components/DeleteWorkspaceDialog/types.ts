import type { Workspace } from "@pilot43/protocol"

export interface DeleteWorkspaceDialogProps {
  onClose: () => void
  /** Called after the workspace was deleted. */
  onDeleted?: () => void
  workspace: null | Workspace
}
