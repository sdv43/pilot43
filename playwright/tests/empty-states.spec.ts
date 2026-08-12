import { expect, test } from "../fixtures"
import { modelProviderTypes } from "./mocks/providers"
import { openSettingsDialog, getSettingsDialog } from "./utils/settings"
import { selectWorkspace } from "./utils/workspace"

test.describe("Empty states", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => []
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.chatGetByWorkspace = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.commandGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
    sidepanelPage.mocks.appSettingsGet = async () => ({
      id: "app",
      titleGenerationModel: "disabled",
      titleModel: null,
    })
  })

  test("Empty state is visible when there are no workspaces", async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.open()

    // check that the empty state is visible when there are no workspaces
    await expect(
      sidepanelPage.page.getByText(
        "Please create a workspace to start chatting",
      ),
    ).toBeVisible()

    // check that the button "Manage workspaces" is visible and opens the workspace management dialog
    await sidepanelPage.page
      .getByRole("button", { name: "Manage workspaces" })
      .click()

    await expect(
      sidepanelPage.page.getByRole("dialog", { name: "Workspaces" }),
    ).toBeVisible()
  })

  test("Empty state is visible when there are no chats in a workspace", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
      { id: "2", name: "Workspace 2", lastSelectedChatId: null },
    ]
    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 1")

    // check that the empty state is visible when there are no chats in a workspace
    await expect(
      sidepanelPage.page.getByText("Send a message to start the chat"),
    ).toBeVisible()

    await expect(
      sidepanelPage.page.getByRole("region", { name: "Chat List" }),
    ).toBeEmpty()
  })

  test("Empty state is visible when there are workspaces but no one is selected", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
      { id: "2", name: "Workspace 2", lastSelectedChatId: null },
    ]

    await sidepanelPage.open()

    // check that the empty state is visible when there are workspaces but no one is selected
    await expect(
      sidepanelPage.page.getByText(
        "Please select a workspace to start chatting",
      ),
    ).toBeVisible()
  })

  test("Empty state is visible when there are no providers in the settings dialog", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.modelProviderTypeGet = async () => modelProviderTypes
    sidepanelPage.mocks.modelProviderGet = async () => []

    await sidepanelPage.open()

    // check that the settings dialog is open
    await openSettingsDialog(sidepanelPage.page)

    // select providers tab
    await sidepanelPage.page
      .getByRole("button")
      .filter({ hasText: "Providers" })
      .click()

    // check that the empty state is visible when there are no providers in the settings dialog
    await expect(
      getSettingsDialog(sidepanelPage.page).getByRole("region", {
        name: "Model Providers",
      }),
    ).toHaveText(/No model providers configured yet/)
  })
})
