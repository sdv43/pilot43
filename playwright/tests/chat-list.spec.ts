import type { Chat, Workspace } from "../../src/shared/api"
import { expect, test } from "../fixtures"
import { selectWorkspace } from "./utils/workspace"

test.describe("ChatList", () => {
  test.beforeEach(async ({ sidepanelPage }) => {
    let workspaces: Workspace[] = [
      { id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" },
    ]
    let chats: Chat[] = [
      {
        id: "c2",
        workspaceId: "w1",
        title: "Chat 2",
        settings: { tools: [] },
        updatedAt: Date.now() - 1000,
      },
      {
        id: "c1",
        workspaceId: "w1",
        title: "Chat 1",
        settings: { tools: [] },
        updatedAt: Date.now(),
      },
    ]

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
      workspaces = workspaces.map((w) =>
        w.id === workspace.id ? workspace : w,
      )
      return workspace
    }
    sidepanelPage.mocks.chatDelete = async (chatId) => {
      chats = chats.filter((c) => c.id !== chatId)
    }
    sidepanelPage.mocks.chatGetByWorkspace = async () => chats
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
    sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
      chats = chats.map((c) => (c.id === chatId ? { ...c, settings } : c))
      return chats.find((c) => c.id === chatId)!
    }

    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 1")
  })

  test("should display the chat list with the correct active chat", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

    await expect(chatList).toBeVisible()
    await expect(chatList.getByRole("button", { name: "C1" })).toBeVisible()
    await expect(chatList.getByRole("button", { name: "C1" })).toHaveAttribute(
      "data-active",
      "true",
    )

    await expect(chatList.getByRole("button", { name: "C2" })).toBeVisible()

    await chatList.getByRole("button", { name: "C2" }).click()
    await expect(chatList.getByRole("button", { name: "C2" })).toHaveAttribute(
      "data-active",
      "true",
    )
  })

  test("should display the chat list with the full chat titles", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

    // click on the chat list expand button
    await sidepanelPage.page
      .getByRole("button", { name: "Expand chat list" })
      .click()

    // expect the chat list to be expanded
    await expect(chatList.getByText("Today")).toBeVisible()
    await expect(chatList.getByRole("button", { name: "Chat 1" })).toBeVisible()
    await expect(chatList.getByRole("button", { name: "Chat 2" })).toBeVisible()
  })

  test("should display pinned chat at the top of the chat list, and unpinned chat below it", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

    await expect(chatList.getByRole("button")).toHaveText(["C1", "C2"])

    await chatList.getByRole("button", { name: "C2" }).click({
      button: "right",
    })
    await sidepanelPage.page.getByRole("menuitem", { name: "Pin chat" }).click()

    await expect(chatList.getByRole("button")).toHaveText(["C2", "C1"])
    await expect(chatList.getByRole("button", { name: "C2" })).toHaveAttribute(
      "data-pinned",
      "true",
    )
    await expect(chatList.getByRole("button", { name: "C1" })).toHaveAttribute(
      "data-pinned",
      "false",
    )
  })

  test("should remove a chat from the chat list when it is deleted, and select the next available chat", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

    const confirmPromise = new Promise<void>((resolve) => {
      sidepanelPage.page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept()
        resolve()
      })
    })

    await chatList.getByRole("button", { name: "C1" }).click({
      button: "right",
    })
    await sidepanelPage.page
      .getByRole("menuitem", { name: "Delete chat" })
      .click()

    await confirmPromise

    await expect(chatList.getByRole("button", { name: "C1" })).not.toBeVisible()
    await expect(chatList.getByRole("button")).toHaveText(["C2"])
    await expect(chatList.getByRole("button", { name: "C2" })).toHaveAttribute(
      "data-active",
      "true",
    )
  })

  test("should keep a chat in the chat list when the deletion confirmation is dismissed", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

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

    await chatList.getByRole("button", { name: "C1" }).click({
      button: "right",
    })
    await sidepanelPage.page
      .getByRole("menuitem", { name: "Delete chat" })
      .click()

    const confirmDialog = await confirmPromise

    expect(confirmDialog.type).toBe("confirm")
    expect(confirmDialog.message).toBe(
      'Are you sure you want to delete "Chat 1"?',
    )

    await expect(chatList.getByRole("button", { name: "C1" })).toBeVisible()
    await expect(chatList.getByRole("button")).toHaveText(["C1", "C2"])
  })

  test("should sort the chat list by last updated time, with the most recent chat at the top", async ({
    sidepanelPage,
  }) => {
    const chatList = sidepanelPage.page.getByRole("region", {
      name: "Chat List",
    })

    await expect(chatList.getByRole("button")).toHaveText(["C1", "C2"])
  })
})
