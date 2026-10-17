import type { ToolPermission, WorkspaceColor } from "@pilot43/protocol"

export const colorLabels: Record<WorkspaceColor, string> = {
  blue: "Blue",
  gray: "Gray",
  green: "Green",
  orange: "Orange",
  red: "Red",
  violet: "Violet",
}

export const permissionOptions: { label: string; value: ToolPermission }[] = [
  { label: "Always allow", value: "allow" },
  { label: "Always ask", value: "ask" },
]

export const compactPermissionOptions: {
  label: string
  value: ToolPermission
}[] = [
  { label: "Allow", value: "allow" },
  { label: "Ask", value: "ask" },
]

/** Tools shown in an expanded permission group before "Show more". */
export const collapsedToolCount = 4
