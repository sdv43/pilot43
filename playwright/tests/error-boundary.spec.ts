import { expect, test } from "../fixtures"

test.describe("ErrorBoundary", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" },
    ]
    sidepanelPage.mocks.chatGetByWorkspace = async () => []
    sidepanelPage.mocks.appSettingsGet = async () => ({
      id: "app",
      titleGenerationModel: "disabled",
      titleModel: null,
    })
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.pageContentSelectionGet = async () => null
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.commandGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
    sidepanelPage.mocks.chatMessageRunGet = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0

    await sidepanelPage.open()
  })

  test("should render the fallback UI when a query throws", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => {
      throw new Error("workspace exploded")
    }

    await sidepanelPage.page.reload()

    await expect(
      sidepanelPage.page.getByRole("heading", {
        name: "Something went wrong.",
      }),
    ).toBeVisible()
    await expect(
      sidepanelPage.page.getByText("workspace exploded"),
    ).toBeVisible()
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Reload" }),
    ).toBeVisible()
  })

  test("should reload the page when the Reload button is clicked", async ({
    sidepanelPage,
  }) => {
    sidepanelPage.mocks.workspaceGet = async () => {
      throw new Error("workspace exploded")
    }

    await sidepanelPage.page.reload()

    await expect(
      sidepanelPage.page.getByRole("button", { name: "Reload" }),
    ).toBeVisible()

    // Fix the underlying error so the reload succeeds.
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" },
    ]

    await sidepanelPage.page.getByRole("button", { name: "Reload" }).click()

    await expect(
      sidepanelPage.page.getByRole("heading", {
        name: "Something went wrong.",
      }),
    ).not.toBeVisible()
  })
})
