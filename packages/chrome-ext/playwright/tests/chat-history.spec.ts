import type { Chat, Workspace } from "@pilot43/protocol"
import type { Page } from "@playwright/test"
import { expect, test } from "../fixtures"
import { confirmDialog, getConfirmDialog } from "./utils/settings"
import { getLatestToast } from "./utils/toast"

function getChatList(p: Page) {
  return p.getByRole("region", { name: "Chats" })
}

function getSessionRow(p: Page, title: string) {
  return getChatList(p).getByTestId("session-row").filter({ hasText: title })
}

/** Row actions show on hover, so hover the row before clicking one. */
async function clickRowAction(p: Page, title: string, action: string) {
  const row = getSessionRow(p, title)

  await row.hover()
  await row.getByRole("button", { name: `${action} ${title}` }).click()
}

async function openHistory(p: Page) {
  await p.getByRole("button", { name: "Chat history" }).click()
  await expect(p.getByRole("heading", { name: "Chats" })).toBeVisible()
}

test.describe("Chat history", () => {
  let workspaces: Workspace[] = []
  let chats: Chat[] = []
  let workspaceUpdates: Workspace[] = []

  test.beforeEach(async ({ sidepanelPage }) => {
    workspaces = [{ id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" }]
    chats = [
      {
        id: "c2",
        workspaceId: "w1",
        title: "Chat 2",
        preview: "Second preview",
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
    workspaceUpdates = []

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
      workspaceUpdates.push(workspace)
      workspaces = workspaces.map((w) =>
        w.id === workspace.id ? workspace : w,
      )
      return workspace
    }
    sidepanelPage.mocks.chatDelete = async (chatId) => {
      chats = chats.filter((c) => c.id !== chatId)
    }
    sidepanelPage.mocks.chatGetByWorkspace = async () => chats
    sidepanelPage.mocks.appSettingsGet = async () => ({ id: "app" })
    sidepanelPage.mocks.modelProviderGet = async () => []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.pageContentSelectionGet = async () => null
    sidepanelPage.mocks.pageContentGet = async () => []
    sidepanelPage.mocks.modelToolGet = async () => []
    sidepanelPage.mocks.promptGet = async () => []
    sidepanelPage.mocks.mcpServerGet = async () => []
    sidepanelPage.mocks.chatMessageRunGet = async () => []
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
      chats = chats.map((c) => (c.id === chatId ? { ...c, settings } : c))
      return chats.find((c) => c.id === chatId)!
    }
    sidepanelPage.mocks.chatTitleUpdate = async (chatId, title) => {
      chats = chats.map((c) =>
        c.id === chatId ? { ...c, title, updatedAt: Date.now() } : c,
      )
      return chats.find((c) => c.id === chatId)!
    }
  })

  test("lists chats newest first and marks the active chat", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)

    await expect(page.getByText("Workspace 1 · 2 chats")).toBeVisible()
    await expect(getChatList(page).getByRole("heading")).toHaveText(["Today"])
    await expect(getChatList(page).getByTestId("session-row")).toHaveText([
      /^Chat 1/,
      /^Chat 2Second preview/,
    ])
    await expect(getSessionRow(page, "Chat 1")).toHaveAttribute(
      "data-active",
      "true",
    )
  })

  test("opens a chat from the list", async ({ sidepanelPage }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await getSessionRow(page, "Chat 2").getByRole("button").first().click()

    await expect(page).toHaveURL(/#\/w\/w1\/c\/c2$/)
    await expect
      .poll(() => workspaceUpdates.at(-1)?.lastSelectedChatId)
      .toBe("c2")
  })

  test("filters chats by title and preview", async ({ sidepanelPage }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)

    const search = page.getByRole("searchbox", { name: "Search chats" })
    const rows = getChatList(page).getByTestId("session-row")

    await search.fill("second")
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText("Chat 2")

    await search.fill("missing")
    await expect(rows).toHaveCount(0)
    await expect(page.getByText("No chats match your search")).toBeVisible()
  })

  test("renames a chat", async ({ sidepanelPage }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 1", "Rename")

    const dialog = page.getByRole("dialog", { name: "Rename chat" })
    const input = dialog.getByTestId("rename-chat-input")

    await expect(input).toHaveValue("Chat 1")
    await input.fill("Renamed chat")
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(dialog).not.toBeVisible()
    await expect(getSessionRow(page, "Renamed chat")).toBeVisible()
  })

  test("keeps the rename dialog open and shows the error when renaming fails", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    sidepanelPage.mocks.chatTitleUpdate = async () => {
      throw new Error("Failed to rename chat")
    }

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 1", "Rename")

    const dialog = page.getByRole("dialog", { name: "Rename chat" })

    await dialog.getByTestId("rename-chat-input").fill("Renamed chat")
    await dialog.getByRole("button", { name: "Save" }).click()

    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Failed to rename chat")
  })

  test("pins a chat into the Pinned group and unpins it", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 2", "Pin")

    await expect(getChatList(page).getByRole("heading")).toHaveText([
      "Pinned",
      "Today",
    ])
    await expect(getChatList(page).getByTestId("session-row")).toHaveText([
      /^Chat 2/,
      /^Chat 1/,
    ])
    expect(chats.find((chat) => chat.id === "c2")?.settings.pinned).toBe(true)

    await clickRowAction(page, "Chat 2", "Unpin")
    await expect(getChatList(page).getByRole("heading")).toHaveText(["Today"])
  })

  test("deletes a chat after confirmation", async ({ sidepanelPage }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 1", "Delete")

    await expect(
      getConfirmDialog(page).getByRole("heading", {
        name: "Delete “Chat 1”?",
      }),
    ).toBeVisible()
    await confirmDialog(page)

    await expect(getChatList(page).getByTestId("session-row")).toHaveCount(1)
    await expect(getSessionRow(page, "Chat 2")).toBeVisible()
  })

  test("keeps a chat when the deletion is cancelled", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 1", "Delete")
    await getConfirmDialog(page).getByRole("button", { name: "Cancel" }).click()

    await expect(getConfirmDialog(page)).not.toBeVisible()
    await expect(getChatList(page).getByTestId("session-row")).toHaveCount(2)
  })

  test("shows a toast when deleting fails", async ({ sidepanelPage }) => {
    const page = sidepanelPage.page

    sidepanelPage.mocks.chatDelete = async () => {
      throw new Error("Delete failed")
    }

    await sidepanelPage.open()
    await openHistory(page)
    await clickRowAction(page, "Chat 1", "Delete")
    await confirmDialog(page)

    await expect(getLatestToast(page)).toHaveText(
      "Failed to delete chat: Delete failed",
    )
  })

  test("starts a new chat and clears the selected chat", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await expect(page).toHaveURL(/#\/w\/w1\/c\/c1$/)

    await page.getByRole("button", { name: "New chat" }).click()

    await expect(page).toHaveURL(/#\/w\/w1$/)
    await expect(page.getByTestId("empty-chat")).toBeVisible()
    await expect
      .poll(() => workspaceUpdates.at(-1)?.lastSelectedChatId)
      .toBeNull()
  })

  test("returns to the chat from the history page", async ({
    sidepanelPage,
  }) => {
    const page = sidepanelPage.page

    await sidepanelPage.open()
    await openHistory(page)
    await page.getByRole("button", { name: "Back to chat" }).click()

    await expect(page).toHaveURL(/#\/w\/w1\/c\/c1$/)
  })
})
