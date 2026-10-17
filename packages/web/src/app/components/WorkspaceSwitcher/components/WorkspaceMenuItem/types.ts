import type { Workspace } from "@pilot43/protocol"

export interface WorkspaceMenuItemProps {
  isSelected: boolean
  onSelect: () => void
  workspace: Workspace
}
