import { createHashRouter, Navigate, type RouteObject } from "react-router"

import { ChatPage } from "./pages/ChatPage"
import { HistoryPage } from "./pages/HistoryPage"
import { IndexRedirect } from "./pages/IndexRedirect"
import { RouteError } from "./pages/RouteError"
import { GeneralSettings } from "./pages/settings/GeneralSettings"
import { McpServerEdit } from "./pages/settings/McpServerEdit"
import { McpSettings } from "./pages/settings/McpSettings"
import { PromptEdit } from "./pages/settings/PromptEdit"
import { PromptsSettings } from "./pages/settings/PromptsSettings"
import { ProviderEdit } from "./pages/settings/ProviderEdit"
import { ProvidersSettings } from "./pages/settings/ProvidersSettings"
import { WorkspaceEdit } from "./pages/settings/WorkspaceEdit"
import { WorkspacesSettings } from "./pages/settings/WorkspacesSettings"
import { SettingsLayout } from "./pages/SettingsLayout"
import { WelcomePage } from "./pages/WelcomePage"

export function createAppRouter() {
  return createHashRouter([
    {
      children: routes,
      errorElement: <RouteError />,
    },
  ])
}

const routes: RouteObject[] = [
  { element: <IndexRedirect />, path: "/" },
  { element: <WelcomePage />, path: "/welcome" },
  { element: <ChatPage />, path: "/w/:workspaceId" },
  { element: <ChatPage />, path: "/w/:workspaceId/c/:chatId" },
  { element: <HistoryPage />, path: "/w/:workspaceId/history" },
  {
    children: [
      { element: <Navigate replace to="general" />, index: true },
      { element: <GeneralSettings />, path: "general" },
      { element: <WorkspacesSettings />, path: "workspaces" },
      { element: <ProvidersSettings />, path: "providers" },
      { element: <McpSettings />, path: "mcp" },
      { element: <PromptsSettings />, path: "prompts" },
    ],
    element: <SettingsLayout />,
    path: "/settings",
  },
  { element: <WorkspaceEdit />, path: "/settings/workspaces/new" },
  { element: <WorkspaceEdit />, path: "/settings/workspaces/:workspaceId" },
  { element: <ProviderEdit />, path: "/settings/providers/new" },
  { element: <ProviderEdit />, path: "/settings/providers/:providerId" },
  { element: <McpServerEdit />, path: "/settings/mcp/new" },
  { element: <McpServerEdit />, path: "/settings/mcp/:serverName" },
  { element: <PromptEdit />, path: "/settings/prompts/new" },
  { element: <PromptEdit />, path: "/settings/prompts/:promptId" },
  { element: <Navigate replace to="/" />, path: "*" },
]
