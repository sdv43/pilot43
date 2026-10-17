import type { ToolPermission } from "@pilot43/protocol"

export interface PermissionToolRowProps {
  description?: string
  isCustom: boolean
  name: string
  onChange: (value: ToolPermission) => void
  value: ToolPermission
}
