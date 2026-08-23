import { expect, test } from "../../fixtures"
import { selectWorkspace } from "../utils/workspace"
import { getLatestToast } from "../utils/toast"
import {
  attachFiles,
  getAttachmentBadge,
  getAttachmentBadges,
  getMessageEditor,
  getSendMessageButton,
  getStopGeneratingButton,
  selectModel,
} from "../utils/footer"
import {
  createChat,
  createMessageRun,
  createTool,
  createWorkspace,
  openBottomBar,
  setupFooterMocks,
} from "./helpers"

const submitShortcut =
  process.platform === "darwin" ? "Meta+Enter" : "Control+Enter"

test.describe("send message", () => {
  test("keeps send disabled until workspace, text, and model are selected", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    await openBottomBar(sidepanelPage, { selectWorkspaceName: null })

    const page = sidepanelPage.page
    const sendButton = getSendMessageButton(page)

    await expect(sendButton).toBeDisabled()

    await selectWorkspace(page, "Workspace 1")
    await expect(sendButton).toBeDisabled()

    await getMessageEditor(page).fill("Hello from the footer")
    await expect(sendButton).toBeDisabled()

    await selectModel(page, "gpt-4.1")
    await expect(sendButton).toBeEnabled()
  })

  test("sends chat id, workspace id, model and file attachments on click", async ({
    sidepanelPage,
  }) => {
    const { recorders } = setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page
    const fileContent = "Attachment body"

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Hello from the footer")
    await attachFiles(page, {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileContent),
    })
    await expect(getAttachmentBadge(page, "notes.txt")).toBeVisible()

    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)

    const [chatId, message, model, workspaceId] = recorders.sendCalls[0]!

    expect(chatId).toBe("c1")
    expect(workspaceId).toBe("w1")
    expect(model).toEqual({
      name: "gpt-4.1",
      providerId: "provider-1",
    })
    expect(message.content).toContain("Hello from the footer")
    expect(message.attachments).toHaveLength(1)
    expect(message.attachments[0]).toMatchObject({
      type: "file",
      mediaType: "text/plain",
      name: "notes.txt",
      content: fileContent,
      size: Buffer.byteLength(fileContent),
    })
    expect(message.attachmentReferences).toHaveLength(1)
  })

  test("submits with the keyboard shortcut only when sending is enabled", async ({
    sidepanelPage,
  }) => {
    const { recorders } = setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Shortcut submit")
    await getMessageEditor(page).press(submitShortcut)

    expect(recorders.sendCalls).toHaveLength(0)

    await selectModel(page, "gpt-4.1")
    await getMessageEditor(page).press(submitShortcut)

    await expect.poll(() => recorders.sendCalls.length).toBe(1)
  })

  test("clears the draft and attachments after a successful send", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Reset footer state")
    await attachFiles(page, {
      name: "draft.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("draft content"),
    })
    await expect(getAttachmentBadge(page, "draft.txt")).toBeVisible()

    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect(getMessageEditor(page)).toHaveValue("")
    await expect(getAttachmentBadges(page)).toHaveCount(0)
  })

  test("shows a toast when sending fails", async ({ sidepanelPage }) => {
    setupFooterMocks(sidepanelPage)
    sidepanelPage.mocks.chatMessageSend = async () => {
      throw new Error("backend unavailable")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Will fail")
    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect(getLatestToast(page)).toHaveText(
      "Error sending message: backend unavailable",
    )
  })

  for (const status of ["pending", "running"] as const) {
    test(`blocks sending while the latest run is ${status}`, async ({
      sidepanelPage,
    }) => {
      const { state, recorders } = setupFooterMocks(sidepanelPage)
      state.messageRuns = [createMessageRun({ id: `mr-${status}`, status })]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await expect(getSendMessageButton(page)).toHaveCount(0)
      await expect(getStopGeneratingButton(page)).toBeVisible()

      await getMessageEditor(page).fill(`Blocked while ${status}`)
      await selectModel(page, "gpt-4.1")
      await getMessageEditor(page).press(submitShortcut)

      expect(recorders.sendCalls).toHaveLength(0)
    })
  }

  test("sends default initial tool settings for a new chat", async ({
    sidepanelPage,
  }) => {
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.workspaces = [createWorkspace({ lastSelectedChatId: null })]
    state.chats = []
    state.tools = [
      createTool({ name: "tool-a", defaultEnabled: false }),
      createTool({
        id: "tool-b",
        name: "tool-b",
        description: "Tool B",
        defaultEnabled: true,
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("New chat settings")
    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)

    const [chatId, , , workspaceId, initialSettings] = recorders.sendCalls[0]!

    expect(chatId).toBe("")
    expect(workspaceId).toBe("w1")
    expect(initialSettings).toEqual({
      tools: [
        { enabled: false, name: "tool-a" },
        { enabled: true, name: "tool-b" },
      ],
    })
  })

  test("sends persisted chat tool settings for an existing chat", async ({
    sidepanelPage,
  }) => {
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.tools = [
      createTool({ name: "tool-a", defaultEnabled: true }),
      createTool({
        id: "tool-b",
        name: "tool-b",
        description: "Tool B",
        defaultEnabled: false,
      }),
    ]
    state.chats = [
      createChat({
        settings: {
          tools: [{ name: "tool-a", enabled: false }],
        },
      }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getMessageEditor(page).fill("Existing chat settings")
    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)

    const [, , , , initialSettings] = recorders.sendCalls[0]!

    expect(initialSettings).toEqual({
      tools: [
        { enabled: false, name: "tool-a" },
        { enabled: false, name: "tool-b" },
      ],
    })
  })
})

test.describe("stop generating", () => {
  for (const status of ["pending", "running"] as const) {
    test(`shows stop for ${status} runs, stops the active run and restores send`, async ({
      sidepanelPage,
    }) => {
      const { state, recorders } = setupFooterMocks(sidepanelPage)
      state.messageRuns = [createMessageRun({ id: `mr-${status}`, status })]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await expect(getSendMessageButton(page)).toHaveCount(0)
      await expect(getStopGeneratingButton(page)).toBeVisible()

      await getStopGeneratingButton(page).click()

      await expect.poll(() => recorders.stopCalls).toEqual([`mr-${status}`])
      await expect(getSendMessageButton(page)).toBeVisible()
      await expect(getStopGeneratingButton(page)).toHaveCount(0)
    })
  }

  test("disables stop while the stop request is pending", async ({
    sidepanelPage,
  }) => {
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [createMessageRun({ status: "running" })]

    let resolveStop!: () => void

    sidepanelPage.mocks.chatMessageRunStop = async (id) => {
      recorders.stopCalls.push(id)

      await new Promise<void>((resolve) => {
        resolveStop = () => {
          state.messageRuns = state.messageRuns.map((messageRun) =>
            messageRun.id === id
              ? {
                  ...messageRun,
                  status: "stopped",
                  updatedAt: Date.now(),
                }
              : messageRun,
          )
          resolve()
        }
      })
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getStopGeneratingButton(page).click()
    await expect(getStopGeneratingButton(page)).toBeDisabled()

    resolveStop()

    await expect(getSendMessageButton(page)).toBeVisible()
  })

  test("shows a toast when stopping fails", async ({ sidepanelPage }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.messageRuns = [createMessageRun({ status: "running" })]
    sidepanelPage.mocks.chatMessageRunStop = async () => {
      throw new Error("cannot stop")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await getStopGeneratingButton(page).click()

    await expect(getLatestToast(page)).toHaveText(
      "Error stopping message: cannot stop",
    )
  })

  for (const status of ["completed", "failed", "stopped"] as const) {
    test(`does not show stop when the latest run is ${status}`, async ({
      sidepanelPage,
    }) => {
      const { state } = setupFooterMocks(sidepanelPage)
      state.messageRuns = [createMessageRun({ status })]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await expect(getStopGeneratingButton(page)).toHaveCount(0)
      await expect(getSendMessageButton(page)).toBeVisible()
    })
  }
})
