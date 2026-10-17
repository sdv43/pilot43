import type { ToolPermission } from "@pilot43/protocol"

export interface PermissionControlProps {
  "aria-label": string
  onChange: (value: ToolPermission) => void
  value: ToolPermission
}
