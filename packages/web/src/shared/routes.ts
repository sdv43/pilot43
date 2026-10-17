import type { Chat, Workspace } from "@pilot43/protocol"

export type SettingsTab =
  "general" | "mcp" | "prompts" | "providers" | "workspaces"

/** URL builders for every screen. The app uses hash URLs (`#/w/...`). */
export const paths = {
  chat: (workspaceId: Workspace["id"], chatId?: Chat["id"] | null) =>
    chatId ? `/w/${workspaceId}/c/${chatId}` : `/w/${workspaceId}`,
  history: (workspaceId: Workspace["id"]) => `/w/${workspaceId}/history`,
  home: () => "/",
  settings: (tab: SettingsTab = "general") => `/settings/${tab}`,
  settingsItem: (tab: Exclude<SettingsTab, "general">, id: string) =>
    `/settings/${tab}/${encodeURIComponent(id)}`,
  settingsNew: (tab: Exclude<SettingsTab, "general">) => `/settings/${tab}/new`,
}
