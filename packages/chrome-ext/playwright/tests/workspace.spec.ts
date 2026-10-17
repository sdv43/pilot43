import type { Workspace } from "@pilot43/protocol"
import { expect, test } from "../fixtures"
import { confirmDialog, getConfirmDialog, openSettings } from "./utils/settings"
import { getLatestToast } from "./utils/toast"
import {
  getWorkspaceMenu,
  getWorkspaceSelector,
  openWorkspaceSelector,
  selectWorkspace,
} from "./utils/workspace"

test.describe("Workspaces", () => {
  let workspaces: Workspace[] = []

  test.beforeEach(async ({ sidepanelPage }) => {
    workspaces = [{ id: "1", name: "Workspace 1", lastSelectedChatId: null }]

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceCreate = async (workspace) => {
      const newWorkspace = {
        ...workspace,
        id: String(workspaces.length + 1),
        lastSelectedChatId: null,
      }
      workspaces = [...workspaces, newWorkspace]
      return newWorkspace
    }
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
      workspaces = workspaces.map((w) =>
        w.id === workspace.id ? workspace : w,
      )
      return workspace
    }
    sidepanelPage.mocks.workspaceDelete = async (id) => {
      workspaces = workspaces.filter((w) => w.id !== id)
    }
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.chatGetByWorkspace = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.appSettingsGet = async () => ({ id: "app" })
    sidepanelPage.mocks.promptGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
  })

  test("workspace selector shows the first workspace", async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.open()
    await expect(getWorkspaceSelector(sidepanelPage.page)).toContainText(
      "Workspace 1",
    )
  })

  test("workspace selection", async ({ sidepanelPage }) => {
    workspaces = [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
      { id: "2", name: "Workspace 2", lastSelectedChatId: null },
    ]

    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 2")
    await expect(getWorkspaceSelector(sidepanelPage.page)).toContainText(
      "Workspace 2",
    )
    await expect(sidepanelPage.page).toHaveURL(/#\/w\/2$/)
  })

  test("workspace menu filters workspaces by name", async ({
    sidepanelPage,
  }) => {
    workspaces = [
      { id: "1", name: "Personal", lastSelectedChatId: null },
      { id: "2", name: "Research", lastSelectedChatId: null },
    ]
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openWorkspaceSelector(page)
    await getWorkspaceMenu(page)
      .getByRole("textbox", { name: "Search workspaces" })
      .fill("res")

    const items = getWorkspaceMenu(page).getByRole("menuitemradio")
    await expect(items).toHaveCount(1)
    await expect(items).toContainText("Research")
  })

  test.describe("workspace CRUD", () => {
    test.beforeEach(async ({ sidepanelPage }) => {
      await sidepanelPage.open()
      await openWorkspaceSelector(sidepanelPage.page)
      await getWorkspaceMenu(sidepanelPage.page)
        .getByRole("menuitem", { name: "Manage workspaces" })
        .click()

      await expect(
        sidepanelPage.page.getByTestId("settings-tab-workspaces"),
      ).toHaveAttribute("aria-current", "page")
    })

    test("creation", async ({ sidepanelPage }) => {
      const page = sidepanelPage.page

      await page.getByTestId("new-workspace").click()
      await expect(
        page.getByRole("heading", { name: "New workspace" }),
      ).toBeVisible()
      await page.getByTestId("workspace-name-input").fill("New Workspace")
      await page
        .getByTestId("workspace-system-prompt")
        .fill("Answer in English.")
      await page.getByTestId("workspace-save").click()

      await expect(
        page.getByTestId("workspace-row").filter({ hasText: "New Workspace" }),
      ).toBeVisible()
      expect(workspaces.at(-1)).toMatchObject({
        name: "New Workspace",
        systemPrompt: "Answer in English.",
      })
    })

    test("creation requires a name", async ({ sidepanelPage }) => {
      const page = sidepanelPage.page

      await page.getByTestId("new-workspace").click()
      await page.getByTestId("workspace-save").click()

      await expect(page.getByText("Workspace name is required")).toBeVisible()
      expect(workspaces).toHaveLength(1)
    })

    test("update", async ({ sidepanelPage }) => {
      const page = sidepanelPage.page

      await page.getByRole("button", { name: "Edit Workspace 1" }).click()
      await expect(
        page.getByRole("heading", { name: "Edit workspace" }),
      ).toBeVisible()
      await page.getByTestId("workspace-name-input").fill("Updated Workspace")
      await page.getByTestId("workspace-save").click()

      const rows = page.getByTestId("workspace-row")
      await expect(rows).toHaveCount(1)
      await expect(rows).toContainText("Updated Workspace")
    })

    test("deletion", async ({ sidepanelPage }) => {
      const page = sidepanelPage.page

      await page.getByRole("button", { name: "Delete Workspace 1" }).click()

      // The confirm button stays disabled until the name is typed.
      await expect(
        getConfirmDialog(page).getByTestId("confirm-dialog-confirm"),
      ).toBeDisabled()
      await confirmDialog(page, "Workspace 1")

      await expect(page.getByTestId("workspace-row")).toHaveCount(0)
      expect(workspaces).toHaveLength(0)
    })

    test("deletion is cancelled when the confirmation is dismissed", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await page.getByRole("button", { name: "Delete Workspace 1" }).click()
      await getConfirmDialog(page)
        .getByRole("button", { name: "Cancel" })
        .click()

      await expect(getConfirmDialog(page)).not.toBeVisible()
      await expect(page.getByTestId("workspace-row")).toHaveCount(1)
    })

    test("error toast is visible if workspace creation fails", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      sidepanelPage.mocks.workspaceCreate = async () => {
        throw new Error("Creation failed")
      }

      await page.getByTestId("new-workspace").click()
      await page.getByTestId("workspace-name-input").fill("New Workspace")
      await page.getByTestId("workspace-save").click()

      await expect(getLatestToast(page)).toHaveText(
        "Failed to save workspace: Creation failed",
      )
    })
  })

  test("settings back button returns to the chat", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openSettings(page, "Workspaces")
    await page.getByRole("button", { name: "Back to chat" }).click()

    await expect(getWorkspaceSelector(page)).toBeVisible()
  })
})
