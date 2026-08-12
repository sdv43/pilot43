import type { Workspace } from "../../src/shared/api"
import { expect, test } from "../fixtures"
import { getLatestToast } from "./utils/toast"
import {
  getWorkspaceSelector,
  openWorkspaceSelector,
  selectWorkspace,
} from "./utils/workspace"

test.describe("Workspaces", () => {
  let workspaces = [
    { id: "1", name: "Workspace 1", lastSelectedChatId: null },
  ] as Workspace[]

  test.beforeEach(async ({ sidepanelPage }) => {
    workspaces = [{ id: "1", name: "Workspace 1", lastSelectedChatId: null }]

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceCreate = async ({ name }) => {
      const newWorkspace = {
        id: String(workspaces.length + 1),
        name,
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
    sidepanelPage.mocks.appSettingsGet = async () => ({
      id: "app",
      titleGenerationModel: "disabled",
      titleModel: null,
    })
    sidepanelPage.mocks.commandGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
  })

  test("workspace selector is visible", async ({ sidepanelPage }) => {
    await sidepanelPage.open()
    await expect(getWorkspaceSelector(sidepanelPage.page)).toBeVisible()
  })

  test("workspace selection", async ({ sidepanelPage }) => {
    sidepanelPage.mocks.workspaceGet = async () => [
      { id: "1", name: "Workspace 1", lastSelectedChatId: null },
      { id: "2", name: "Workspace 2", lastSelectedChatId: null },
    ]

    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 2")
    await expect(getWorkspaceSelector(sidepanelPage.page)).toHaveText(
      "Workspace 2",
    )
  })

  test.describe("workspace CRUD", () => {
    test.beforeEach(async ({ sidepanelPage }) => {
      await sidepanelPage.open()

      // open the workspace selector
      await openWorkspaceSelector(sidepanelPage.page)

      // click on the "Manage workspaces" button
      await sidepanelPage.page
        .getByRole("button", { name: "Manage workspaces" })
        .click()

      // check that the workspaces dialog is visible
      await expect(
        sidepanelPage.page.getByRole("heading", { name: "Manage Workspaces" }),
      ).toBeVisible()
    })

    test("creation", async ({ sidepanelPage }) => {
      // add a new workspace
      await sidepanelPage.page
        .getByPlaceholder("New workspace name")
        .fill("New Workspace")
      await sidepanelPage.page
        .getByRole("button", { name: "Add workspace" })
        .click()

      // check that the new workspace is in the list
      await expect(
        sidepanelPage.page.getByRole("dialog").getByText("New Workspace"),
      ).toBeVisible()
    })

    test("update", async ({ sidepanelPage }) => {
      // change the name of an existing workspace
      await sidepanelPage.page
        .getByRole("button", { name: "Rename Workspace 1" })
        .click()
      await sidepanelPage.page
        .getByRole("textbox")
        .first()
        .fill("Updated Workspace")
      await sidepanelPage.page
        .getByRole("button", { name: "Confirm rename" })
        .click()

      // check that the workspace name is updated in the list
      await expect(
        sidepanelPage.page.getByRole("dialog").getByText("Updated Workspace"),
      ).toBeVisible()
      await expect(
        sidepanelPage.page.getByRole("dialog").getByText("Workspace 1"),
      ).not.toBeVisible()
    })

    test("deletion", async ({ sidepanelPage }) => {
      const confirmPromise = new Promise<void>((resolve) => {
        sidepanelPage.page.once("dialog", async (confirmDialog) => {
          await confirmDialog.accept()
          resolve()
        })
      })

      // delete an existing workspace
      await sidepanelPage.page
        .getByRole("button", { name: "Delete Workspace 1" })
        .click()

      await confirmPromise

      // check that the workspace is removed from the list
      await expect(
        sidepanelPage.page.getByRole("dialog").getByText("Workspace 1"),
      ).not.toBeVisible()

      // close the workspaces dialog
      await sidepanelPage.page.keyboard.press("Escape")
      await expect(
        sidepanelPage.page.getByRole("heading", { name: "Manage Workspaces" }),
      ).not.toBeVisible()

      // open the workspace selector
      await sidepanelPage.page
        .getByRole("button", { name: "Select workspace" })
        .click()

      // check that the deleted workspace is not in the list
      await expect(
        sidepanelPage.page.getByRole("option", { name: "Workspace 1" }),
      ).not.toBeVisible()
    })

    test("deletion is cancelled when the confirmation is dismissed", async ({
      sidepanelPage,
    }) => {
      const confirmPromise = new Promise<{
        message: string
        type: string
      }>((resolve) => {
        sidepanelPage.page.once("dialog", async (confirmDialog) => {
          const data = {
            message: confirmDialog.message(),
            type: confirmDialog.type(),
          }

          await confirmDialog.dismiss()
          resolve(data)
        })
      })

      // click delete but dismiss the confirmation
      await sidepanelPage.page
        .getByRole("button", { name: "Delete Workspace 1" })
        .click()

      const confirmDialog = await confirmPromise

      expect(confirmDialog.type).toBe("confirm")
      expect(confirmDialog.message).toBe(
        'Are you sure you want to delete "Workspace 1"?',
      )

      // check that the workspace is still in the list
      await expect(
        sidepanelPage.page.getByRole("dialog").getByText("Workspace 1"),
      ).toBeVisible()
    })

    test("error toast is visible if workspace creation fails", async ({
      sidepanelPage,
    }) => {
      // mock the workspace creation API to return an error
      sidepanelPage.mocks.workspaceCreate = async () => {
        throw new Error("Creation failed")
      }

      // add a new workspace
      await sidepanelPage.page
        .getByPlaceholder("New workspace name")
        .fill("New Workspace")
      await sidepanelPage.page
        .getByRole("button", { name: "Add workspace" })
        .click()

      // check that the error toast is visible
      await expect(getLatestToast(sidepanelPage.page)).toHaveText(
        "Failed to create workspace: Creation failed",
      )
    })
  })
})
