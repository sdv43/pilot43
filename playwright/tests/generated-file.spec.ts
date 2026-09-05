import type {
  Chat,
  GeneratedFile,
  MessageRun,
  Workspace,
} from "../../src/shared/api"
import { expect, test } from "../fixtures"
import { getLatestToast } from "./utils/toast"
import { selectWorkspace } from "./utils/workspace"

test.describe("Generated file", () => {
  let workspaces: Workspace[] = [
    { id: "w1", name: "Workspace 1", lastSelectedChatId: "c1" },
  ]
  let chats: Chat[] = [
    {
      id: "c1",
      workspaceId: "w1",
      title: "Chat 1",
      settings: { tools: [] },
      updatedAt: Date.now(),
    },
  ]
  let generatedFiles: GeneratedFile[] = []

  const messageRun: MessageRun = {
    chatId: "c1",
    userMessage: {
      role: "user",
      attachments: [],
      messageRunId: "mr1",
      content: "Create a report file",
      createdAt: Date.now(),
      id: "um1",
    },
    assistantMessages: [
      {
        id: "am1",
        role: "assistant",
        messageRunId: "mr1",
        content: "Here is your report.",
        createdAt: Date.now(),
        tools: [
          {
            id: "tc1",
            name: "generate_file",
            args: {
              content: "# Report\nHello",
              filename: "report.md",
            },
            result: {
              fileId: "gf1",
              filename: "report.md",
              lines: 2,
              mimeType: "text/markdown",
              ok: true,
              preview: "# Report\nHello",
              size: 14,
            },
          },
          {
            id: "tc2",
            name: "fetch",
            args: { url: "https://example.com" },
            result: { ok: true },
          },
        ],
      },
    ],
    status: "completed",
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelMeta: {
      name: "gpt-4",
      provider: "openai",
      settings: {},
    },
    id: "mr1",
  }

  test.beforeEach(async ({ sidepanelPage }) => {
    generatedFiles = [
      {
        id: "gf1",
        chatId: "c1",
        filename: "report.md",
        mimeType: "text/markdown",
        content: "# Report\nHello",
        size: 14,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => workspace
    sidepanelPage.mocks.chatDelete = async () => {}
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
    sidepanelPage.mocks.chatMessageRunGet = async () => [messageRun]
    sidepanelPage.mocks.chatTokenEstimateGet = async () => 0
    sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
      chats = chats.map((c) => (c.id === chatId ? { ...c, settings } : c))
      return chats.find((c) => c.id === chatId)!
    }
    sidepanelPage.mocks.generatedFileGet = async (fileId) => {
      const file = generatedFiles.find((f) => f.id === fileId)

      if (!file) {
        throw new Error("File not found.")
      }

      return file
    }

    await sidepanelPage.open()
    await selectWorkspace(sidepanelPage.page, "Workspace 1")
  })

  test("should render a download badge instead of a generic tool block", async ({
    sidepanelPage,
  }) => {
    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })
    const badge = chat.getByTestId("generated-file-badge")

    await expect(badge).toBeVisible()
    await expect(badge).toContainText("report.md")

    // generate_file is excluded from the generic JSON tool list
    await expect(chat.getByTestId("assistant-tool")).toHaveCount(1)
    await expect(chat.getByTestId("assistant-tool")).toContainText("fetch")
  })

  test("should download the file when the badge is clicked", async ({
    sidepanelPage,
  }) => {
    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })
    const downloadPromise = sidepanelPage.page.waitForEvent("download")

    await chat.getByTestId("generated-file-badge").click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe("report.md")

    // success toast after the download starts
    await expect(getLatestToast(sidepanelPage.page)).toContainText(
      "Downloaded report.md",
    )
  })

  test("should show an error toast when the file is missing", async ({
    sidepanelPage,
  }) => {
    generatedFiles = []

    const chat = sidepanelPage.page.getByRole("region", { name: "Chat" })

    await chat.getByTestId("generated-file-badge").click()

    await expect(getLatestToast(sidepanelPage.page)).toContainText(
      "File not found",
    )
  })
})
