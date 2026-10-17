import type { ToolPermission, WorkspaceColor } from "@pilot43/protocol"

export const colorLabels: Record<WorkspaceColor, string> = {
  blue: "Blue",
  gray: "Gray",
  green: "Green",
  orange: "Orange",
  red: "Red",
  violet: "Violet",
}

export const permissionOptions: {
  description: string
  label: string
  value: ToolPermission
}[] = [
  { description: "Runs without asking", label: "Allow", value: "allow" },
  { description: "Pauses for approval", label: "Ask", value: "ask" },
  { description: "Hidden from chats", label: "Disabled", value: "disabled" },
]

/** Tools shown in an expanded permission group before "Show more". */
export const collapsedToolCount = 4
