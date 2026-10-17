import type { SettingsTab } from "../../../shared/routes"

export const settingsTabs: { label: string; tab: SettingsTab }[] = [
  { label: "General", tab: "general" },
  { label: "Workspaces", tab: "workspaces" },
  { label: "Providers", tab: "providers" },
  { label: "MCP", tab: "mcp" },
  { label: "Prompts", tab: "prompts" },
]
