import type { Workspace } from "@pilot43/protocol"

export interface WorkspaceAvatarProps {
  className?: string
  size?: "large" | "medium" | "small"
  workspace: Pick<Workspace, "color" | "name">
}
