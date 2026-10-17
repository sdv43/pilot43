import type { ToolPermission } from "@pilot43/protocol"

import { BanIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react"

export const permissionIcons = {
  allow: ShieldCheckIcon,
  ask: ShieldIcon,
  disabled: BanIcon,
} satisfies Record<ToolPermission, unknown>
