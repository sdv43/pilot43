import type { Workspace } from "@pilot43/protocol"
import { expect, test } from "../fixtures"
import { modelProviderTypes } from "./mocks/providers"
import { openSettings } from "./utils/settings"
import { getWorkspaceSelector } from "./utils/workspace"

test.describe("Empty states", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => []
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.chatGetByWorkspace = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.promptGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
    sidepanelPage.mocks.appSettingsGet = async () => ({ id: "app" })
  })

  test("Welcome screen creates the first workspace", async ({
    sidepanelPage,
  }) => {
    let workspaces: Workspace[] = []
    const page = sidepanelPage.page

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceCreate = async (workspace) => {
      const created = { ...workspace, id: "1", lastSelectedChatId: null }
      workspaces = [created]
      return created
    }

    await sidepanelPage.open()

    await expect(
      page.getByRole("heading", { name: "Welcome to Pilot43" }),
    ).toBeVisible()
    await expect(page.getByLabel("Workspace name")).toHaveValue("Personal")

    await page.getByRole("button", { name: "Create workspace" }).click()

    await expect(getWorkspaceSelector(page)).toContainText("Personal")
    await expect(page).toHaveURL(/#\/w\/1$/)
  })

  test("Empty state is visible when there are no chats in a workspace", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
    ]
    const page = sidepanelPage.page

    await sidepanelPage.open()

    await expect(page.getByTestId("empty-chat")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "How can I help?" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Chat history" }).click()
    await expect(page.getByText("No chats yet")).toBeVisible()
  })

  test("Empty state is visible when there are no providers", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
    ]
    sidepanelPage.mocks.modelProviderTypeGet = async () => modelProviderTypes

    await sidepanelPage.open()
    await openSettings(sidepanelPage.page, "Providers")

    await expect(
      sidepanelPage.page.getByText(
        "Add an OpenAI, OpenRouter or Ollama provider to start chatting.",
      ),
    ).toBeVisible()
  })
})
