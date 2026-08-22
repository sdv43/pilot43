import type {
  ApiClient,
  Chat,
  Command,
  MessageRun,
  PageContent,
  PageContentSelection,
  ModelProviderModel,
  ModelTool,
  McpServer,
  OpenAIModelProvider,
  Workspace,
} from "../../src/shared/api"
import { expect, test } from "../fixtures"
import {
  attachFiles,
  getAttachmentBadge,
  getAttachmentBadges,
  getAttachmentPreview,
  getEditorAutocompleteOption,
  getEditorCommandTokens,
  getMessageEditor,
  getMcpServerCheckbox,
  getModelSearchInput,
  getModelSelector,
  getSendMessageButton,
  getStopGeneratingButton,
  getTokenEstimation,
  getTodoList,
  getTodoListClearButton,
  getTodoListItems,
  getTodoListTrigger,
  getToolCheckbox,
  openModelSelector,
  openAttachmentPreview,
  openTodoList,
  openToolsPopover,
  pasteFiles,
  selectModel,
} from "./utils/footer"
import { getLatestToast } from "./utils/toast"
import { selectWorkspace } from "./utils/workspace"

const submitShortcut =
  process.platform === "darwin" ? "Meta+Enter" : "Control+Enter"

type ChatMessageSendArgs = Parameters<ApiClient["chatMessageSend"]>

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Workspace 1",
    lastSelectedChatId: "c1",
    ...overrides,
  }
}

function createChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "c1",
    workspaceId: "w1",
    title: "Chat 1",
    settings: { tools: [] },
    updatedAt: Date.now(),
    ...overrides,
  }
}

function createProvider(
  overrides: Partial<OpenAIModelProvider> = {},
): OpenAIModelProvider {
  const { settings, ...restOverrides } = overrides

  return {
    id: "provider-1",
    name: "OpenAI",
    type: "openai",
    settings: {
      apiKey: "sk-test",
      host: "https://api.openai.com",
      ...settings,
    },
    ...restOverrides,
  }
}

function createModel(
  overrides: Partial<ModelProviderModel> = {},
): ModelProviderModel {
  return {
    id: "provider-1::gpt-4.1",
    name: "gpt-4.1",
    providerId: "provider-1",
    ...overrides,
  }
}

function createTool(overrides: Partial<ModelTool> = {}): ModelTool {
  return {
    id: "tool-a",
    name: "tool-a",
    description: "Tool A",
    defaultEnabled: true,
    ...overrides,
  }
}

function createMcpServer(overrides: Partial<McpServer> = {}): McpServer {
  return {
    name: "Docs",
    type: "http",
    url: "https://example.com/mcp",
    ...overrides,
  }
}

function createMessageRun(overrides: Partial<MessageRun> = {}): MessageRun {
  const id = overrides.id ?? "mr1"
  const createdAt = overrides.createdAt ?? Date.now()

  return {
    id,
    chatId: "c1",
    userMessage: {
      id: "um1",
      role: "user",
      attachments: [],
      messageRunId: id,
      content: "Hello, assistant!",
      createdAt,
      tokenCount: 24,
    },
    assistantMessages: [],
    status: "completed",
    error: null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    modelMeta: {
      name: "gpt-4.1",
      provider: "provider-1",
      settings: {},
    },
    ...overrides,
  }
}

test.describe("BottomBar", () => {
  let workspaces: Workspace[]
  let chats: Chat[]
  let messageRuns: MessageRun[]
  let modelProviders: OpenAIModelProvider[]
  let modelProviderModels: Record<string, ModelProviderModel[]>
  let tools: ModelTool[]
  let tokenEstimate: number
  let sendCalls: ChatMessageSendArgs[]
  let stopCalls: string[]
  let commands: Command[]
  let pages: Pick<PageContent, "id" | "title" | "url">[]
  let pageById: Record<number, PageContent>
  let selection: null | PageContentSelection
  let mcpServers: McpServer[]
  let mcpServerToolsByName: Record<string, ModelTool[]>
  let chatSettingsUpdateCalls: Parameters<ApiClient["chatSettingsUpdate"]>[]
  let chatTodoListClearCalls: string[]

  test.beforeEach(({ sidepanelPage }) => {
    workspaces = [createWorkspace()]
    chats = [createChat()]
    messageRuns = []
    modelProviders = [
      createProvider(),
      createProvider({ id: "provider-2", name: "Anthropic" }),
    ]
    modelProviderModels = {
      "provider-1": [
        createModel(),
        createModel({ id: "provider-1::gpt-4o-mini", name: "gpt-4o-mini" }),
      ],
      "provider-2": [
        createModel({
          id: "provider-2::claude-3-haiku",
          name: "claude-3-haiku",
          providerId: "provider-2",
        }),
        createModel({
          id: "provider-2::claude-3-sonnet",
          name: "claude-3-sonnet",
          providerId: "provider-2",
        }),
      ],
    }
    tools = []
    tokenEstimate = 0
    sendCalls = []
    stopCalls = []
    commands = []
    pages = []
    pageById = {}
    selection = null
    mcpServers = []
    mcpServerToolsByName = {}
    chatSettingsUpdateCalls = []
    chatTodoListClearCalls = []

    sidepanelPage.mocks.appSettingsGet = async () => ({
      id: "app",
      titleGenerationModel: "disabled",
      titleModel: null,
    })
    sidepanelPage.mocks.workspaceGet = async () => workspaces
    sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
      workspaces = workspaces.map((item) =>
        item.id === workspace.id ? workspace : item,
      )

      return workspace
    }
    sidepanelPage.mocks.chatGetByWorkspace = async (workspaceId) =>
      chats.filter((chat) => chat.workspaceId === workspaceId)
    sidepanelPage.mocks.chatMessageRunGet = async (chatId) =>
      messageRuns.filter((messageRun) => messageRun.chatId === chatId)
    sidepanelPage.mocks.chatMessageSend = async (...args) => {
      sendCalls.push(args)

      const [, message] = args

      return {
        id: `um-${sendCalls.length}`,
        role: "user",
        messageRunId: `mr-${sendCalls.length}`,
        createdAt: Date.now(),
        content: message.content,
        attachments: message.attachments,
        ...(message.attachmentReferences
          ? { attachmentReferences: message.attachmentReferences }
          : {}),
        ...(message.commandReference
          ? { commandReference: message.commandReference }
          : {}),
      }
    }
    sidepanelPage.mocks.chatMessageRunStop = async (id) => {
      stopCalls.push(id)
      messageRuns = messageRuns.map((messageRun) =>
        messageRun.id === id
          ? {
              ...messageRun,
              status: "stopped",
              updatedAt: Date.now(),
            }
          : messageRun,
      )
    }
    sidepanelPage.mocks.chatTokenEstimateGet = async () => tokenEstimate
    sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
      chatSettingsUpdateCalls.push([chatId, settings])
      chats = chats.map((chat) =>
        chat.id === chatId ? { ...chat, settings } : chat,
      )

      return chats.find((chat) => chat.id === chatId)!
    }
    sidepanelPage.mocks.modelProviderGet = async () => modelProviders
    sidepanelPage.mocks.modelProviderModelGet = async (providerId) =>
      modelProviderModels[providerId] ?? []
    sidepanelPage.mocks.modelProviderTypeGet = async () => []
    sidepanelPage.mocks.modelProviderCheck = async () => ({
      success: true,
      message: "ok",
    })
    sidepanelPage.mocks.modelToolGet = async () => tools
    sidepanelPage.mocks.commandGet = async () => commands
    sidepanelPage.mocks.mcpServerGet = async () => mcpServers
    sidepanelPage.mocks.mcpServerToolsGet = async (server) =>
      mcpServerToolsByName[server.name] ?? []
    sidepanelPage.mocks.pageContentGet = async () => pages
    sidepanelPage.mocks.pageContentGetById = async (id) => pageById[id] ?? null
    sidepanelPage.mocks.pageContentSelectionGet = async () => selection
    sidepanelPage.mocks.chatTodoListClear = async (chatId) => {
      chatTodoListClearCalls.push(chatId)
      chats = chats.map((chat) =>
        chat.id === chatId ? { ...chat, todoList: null } : chat,
      )
    }
    sidepanelPage.mocks.chatDelete = async () => undefined
  })

  async function openBottomBar(
    sidepanelPage: {
      open: () => Promise<void>
      page: Parameters<typeof selectWorkspace>[0]
    },
    options?: { selectWorkspaceName?: null | string },
  ) {
    await sidepanelPage.open()

    if (options?.selectWorkspaceName === null) {
      return
    }

    await selectWorkspace(
      sidepanelPage.page,
      options?.selectWorkspaceName ?? "Workspace 1",
    )
  }

  async function notifyPageContextUpdated(sidepanelPage: {
    page: Parameters<typeof selectWorkspace>[0]
  }) {
    await sidepanelPage.page.evaluate(async () => {
      await chrome.runtime.sendMessage({
        target: "sidepanel",
        action: "pageContextUpdated",
        payload: { reason: "tabUpdated" },
      })
    })
  }

  test.describe("send message", () => {
    test("keeps send disabled until workspace, text, and model are selected", async ({
      sidepanelPage,
    }) => {
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

      await expect.poll(() => sendCalls.length).toBe(1)

      const [chatId, message, model, workspaceId] = sendCalls[0]!

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
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Shortcut submit")
      await getMessageEditor(page).press(submitShortcut)

      expect(sendCalls).toHaveLength(0)

      await selectModel(page, "gpt-4.1")
      await getMessageEditor(page).press(submitShortcut)

      await expect.poll(() => sendCalls.length).toBe(1)
    })

    test("clears the draft and attachments after a successful send", async ({
      sidepanelPage,
    }) => {
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
        messageRuns = [createMessageRun({ id: `mr-${status}`, status })]

        const page = sidepanelPage.page

        await openBottomBar(sidepanelPage)
        await expect(getSendMessageButton(page)).toHaveCount(0)
        await expect(getStopGeneratingButton(page)).toBeVisible()

        await getMessageEditor(page).fill(`Blocked while ${status}`)
        await selectModel(page, "gpt-4.1")
        await getMessageEditor(page).press(submitShortcut)

        expect(sendCalls).toHaveLength(0)
      })
    }

    test("sends default initial tool settings for a new chat", async ({
      sidepanelPage,
    }) => {
      workspaces = [createWorkspace({ lastSelectedChatId: null })]
      chats = []
      tools = [
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

      await expect.poll(() => sendCalls.length).toBe(1)

      const [chatId, , , workspaceId, initialSettings] = sendCalls[0]!

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
      tools = [
        createTool({ name: "tool-a", defaultEnabled: true }),
        createTool({
          id: "tool-b",
          name: "tool-b",
          description: "Tool B",
          defaultEnabled: false,
        }),
      ]
      chats = [
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

      await expect.poll(() => sendCalls.length).toBe(1)

      const [, , , , initialSettings] = sendCalls[0]!

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
        messageRuns = [createMessageRun({ id: `mr-${status}`, status })]

        const page = sidepanelPage.page

        await openBottomBar(sidepanelPage)
        await expect(getSendMessageButton(page)).toHaveCount(0)
        await expect(getStopGeneratingButton(page)).toBeVisible()

        await getStopGeneratingButton(page).click()

        await expect.poll(() => stopCalls).toEqual([`mr-${status}`])
        await expect(getSendMessageButton(page)).toBeVisible()
        await expect(getStopGeneratingButton(page)).toHaveCount(0)
      })
    }

    test("disables stop while the stop request is pending", async ({
      sidepanelPage,
    }) => {
      messageRuns = [createMessageRun({ status: "running" })]

      let resolveStop!: () => void

      sidepanelPage.mocks.chatMessageRunStop = async (id) => {
        stopCalls.push(id)

        await new Promise<void>((resolve) => {
          resolveStop = () => {
            messageRuns = messageRuns.map((messageRun) =>
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
      messageRuns = [createMessageRun({ status: "running" })]
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
        messageRuns = [createMessageRun({ status })]

        const page = sidepanelPage.page

        await openBottomBar(sidepanelPage)
        await expect(getStopGeneratingButton(page)).toHaveCount(0)
        await expect(getSendMessageButton(page)).toBeVisible()
      })
    }
  })

  test.describe("model selector", () => {
    test("hydrates the selected model from the latest message run", async ({
      sidepanelPage,
    }) => {
      messageRuns = [
        createMessageRun({
          modelMeta: {
            name: "gpt-4o-mini",
            provider: "provider-1",
            settings: {},
          },
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getModelSelector(page)).toContainText("gpt-4o-mini")
    })

    test("keeps the newest-by-createdAt run selected even if an older run updates later", async ({
      sidepanelPage,
    }) => {
      messageRuns = [
        createMessageRun({
          id: "old-run",
          createdAt: 100,
          updatedAt: 400,
          modelMeta: {
            name: "gpt-4.1",
            provider: "provider-1",
            settings: {},
          },
        }),
        createMessageRun({
          id: "new-run",
          createdAt: 200,
          updatedAt: 300,
          modelMeta: {
            name: "claude-3-sonnet",
            provider: "provider-2",
            settings: {},
          },
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getModelSelector(page)).toContainText("claude-3-sonnet")
    })

    test("disables the selector while models are loading", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.modelProviderGet = async () =>
        await new Promise<OpenAIModelProvider[]>(() => undefined)

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getModelSelector(page)).toBeDisabled()
    })

    test("disables the selector when there are no models", async ({
      sidepanelPage,
    }) => {
      modelProviders = [createProvider()]
      modelProviderModels = { "provider-1": [] }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getModelSelector(page)).toBeDisabled()
    })

    test("filters models case-insensitively, keeps them sorted and shows no matches", async ({
      sidepanelPage,
    }) => {
      modelProviders = [
        createProvider({ id: "provider-2", name: "Anthropic" }),
        createProvider({ id: "provider-1", name: "OpenAI" }),
      ]
      modelProviderModels = {
        "provider-1": [
          createModel({ id: "provider-1::gpt-4o-mini", name: "gpt-4o-mini" }),
          createModel({ id: "provider-1::gpt-4.1", name: "gpt-4.1" }),
        ],
        "provider-2": [
          createModel({
            id: "provider-2::claude-3-sonnet",
            name: "claude-3-sonnet",
            providerId: "provider-2",
          }),
          createModel({
            id: "provider-2::claude-3-haiku",
            name: "claude-3-haiku",
            providerId: "provider-2",
          }),
        ],
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      await expect(page.getByRole("option")).toHaveText([
        "claude-3-haiku",
        "claude-3-sonnet",
        "gpt-4.1",
        "gpt-4o-mini",
      ])

      await getModelSearchInput(page).fill("GPT")

      await expect(page.getByRole("option")).toHaveText([
        "gpt-4.1",
        "gpt-4o-mini",
      ])

      await getModelSearchInput(page).fill("missing-model")

      await expect(page.getByText("No matching models")).toBeVisible()
    })

    test("adds an unavailable selected model as a disabled option", async ({
      sidepanelPage,
    }) => {
      messageRuns = [
        createMessageRun({
          modelMeta: {
            name: "ghost-model",
            provider: "provider-3",
            settings: {},
          },
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      await expect(
        page.getByRole("option", { name: "ghost-model" }),
      ).toBeDisabled()
    })

    test("shows a provider load error inside the selector", async ({
      sidepanelPage,
    }) => {
      modelProviders = [createProvider()]
      sidepanelPage.mocks.modelProviderModelGet = async () => {
        throw new Error("Cannot load models")
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      await expect(
        page.getByRole("listbox").last().getByText("Cannot load models"),
      ).toBeVisible()
    })

    test("collapses and re-expands a provider group", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      const listbox = page.getByRole("listbox").last()
      const anthropicToggle = listbox.getByRole("button", {
        name: "Anthropic",
      })

      await expect(
        listbox.getByRole("option", { name: "claude-3-haiku" }),
      ).toBeVisible()
      await expect(
        listbox.getByRole("option", { name: "gpt-4.1" }),
      ).toBeVisible()

      await anthropicToggle.click()

      await expect(
        listbox.getByRole("option", { name: "claude-3-haiku" }),
      ).toHaveCount(0)
      await expect(
        listbox.getByRole("option", { name: "claude-3-sonnet" }),
      ).toHaveCount(0)
      // Options from other providers stay visible.
      await expect(
        listbox.getByRole("option", { name: "gpt-4.1" }),
      ).toBeVisible()
      await expect(anthropicToggle).toHaveAttribute("aria-expanded", "false")

      await anthropicToggle.click()

      await expect(
        listbox.getByRole("option", { name: "claude-3-haiku" }),
      ).toBeVisible()
      await expect(anthropicToggle).toHaveAttribute("aria-expanded", "true")
    })

    test("keeps a collapsed provider group collapsed after reopening the selector", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      const listbox = page.getByRole("listbox").last()

      await listbox.getByRole("button", { name: "Anthropic" }).click()

      // Close the popover with Escape, then reopen it.
      await page.keyboard.press("Escape")
      await expect(getModelSelector(page)).toHaveAttribute(
        "aria-expanded",
        "false",
      )

      await openModelSelector(page)

      await expect(
        page
          .getByRole("listbox")
          .last()
          .getByRole("option", { name: "claude-3-haiku" }),
      ).toHaveCount(0)
      await expect(
        page
          .getByRole("listbox")
          .last()
          .getByRole("option", { name: "gpt-4.1" }),
      ).toBeVisible()
    })

    test("re-expands collapsed groups when the search query re-filters the list", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openModelSelector(page)

      const listbox = page.getByRole("listbox").last()

      await listbox.getByRole("button", { name: "Anthropic" }).click()

      await expect(
        listbox.getByRole("option", { name: "claude-3-haiku" }),
      ).toHaveCount(0)

      await getModelSearchInput(page).fill("claude")

      await expect(
        listbox.getByRole("option", { name: "claude-3-haiku" }),
      ).toBeVisible()
    })
  })

  test.describe("token estimation", () => {
    test("shows the stored token estimate for the selected chat", async ({
      sidepanelPage,
    }) => {
      tokenEstimate = 120

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getTokenEstimation(page)).toHaveText("120 tok")
    })

    test("adds an approximate draft estimate while typing", async ({
      sidepanelPage,
    }) => {
      tokenEstimate = 120

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("hello")

      await expect(getTokenEstimation(page)).toContainText("~")
      await expect(getTokenEstimation(page)).not.toHaveText("120 tok")
    })

    test("shows a placeholder when there is no stored estimate", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getTokenEstimation(page)).toHaveText("- tok")
    })
  })

  test.describe("attachments", () => {
    test("loads #page attachments, blocks send while loading, and keeps the resolved snapshot", async ({
      sidepanelPage,
    }) => {
      const snapshot: PageContent = {
        id: 42,
        url: "https://example.com/page",
        title: "Example page",
        content: "Initial page content",
        textContent: "Initial page text",
        excerpt: null,
        byline: null,
        siteName: null,
        lang: null,
        length: 0,
        publishedTime: null,
        dir: null,
      }

      let resolveSnapshot!: (value: PageContent) => void

      sidepanelPage.mocks.pageContentGetById = async () =>
        await new Promise<PageContent>((resolve) => {
          resolveSnapshot = resolve
        })

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Check #page:42")
      await selectModel(page, "gpt-4.1")

      await expect(getAttachmentBadge(page, "loading...")).toBeVisible()
      await expect(getSendMessageButton(page)).toBeDisabled()

      resolveSnapshot(snapshot)

      await expect(getAttachmentBadge(page, "Example page")).toBeVisible()
      await openAttachmentPreview(page, "Example page")
      await expect(getAttachmentPreview(page)).toContainText(
        "Initial page text",
      )

      sidepanelPage.mocks.pageContentGetById = async () => ({
        ...snapshot,
        textContent: "Updated page text",
      })

      await notifyPageContextUpdated(sidepanelPage)
      await expect(getAttachmentPreview(page)).toContainText(
        "Initial page text",
      )
    })

    test("marks page attachments as errored and blocks sending", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.pageContentGetById = async () => {
        throw new Error("Cannot load page")
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Check #page:42")
      await selectModel(page, "gpt-4.1")

      await expect(getAttachmentBadge(page, "Page")).toHaveAttribute(
        "data-variant",
        "error",
      )
      await expect(getSendMessageButton(page)).toBeDisabled()
      await expect(getEditorCommandTokens(page).first()).toHaveAttribute(
        "data-has-error",
        "true",
      )

      await openAttachmentPreview(page, "Page")
      await expect(getAttachmentPreview(page)).toContainText("Cannot load page")
    })

    test("shows a disabled #selection:no_selection option when there is no selection", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("#")

      await expect(
        getEditorAutocompleteOption(page, "#selection:no_selection"),
      ).toBeDisabled()
    })

    test("loads #selection attachments and keeps the resolved snapshot", async ({
      sidepanelPage,
    }) => {
      selection = {
        id: 7,
        uniqueKey: "selection-1",
        url: "https://example.com/page",
        title: "Example page",
        description: "Selected text",
        content: "Original selection content",
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Keep #selection:quoted_text")

      await expect(getAttachmentBadge(page, "Example page")).toBeVisible()
      await openAttachmentPreview(page, "Example page")
      await expect(getAttachmentPreview(page)).toContainText(
        "Original selection content",
      )

      selection = {
        ...selection,
        content: "Updated selection content",
      }

      await notifyPageContextUpdated(sidepanelPage)
      await expect(getAttachmentPreview(page)).toContainText(
        "Original selection content",
      )
    })

    test("marks selection attachments as errored and blocks sending", async ({
      sidepanelPage,
    }) => {
      sidepanelPage.mocks.pageContentSelectionGet = async () => {
        throw new Error("Cannot load selection")
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Check #selection:important_text")
      await selectModel(page, "gpt-4.1")

      await expect(getAttachmentBadge(page, "Selection")).toHaveAttribute(
        "data-variant",
        "error",
      )
      await expect(getSendMessageButton(page)).toBeDisabled()

      await openAttachmentPreview(page, "Selection")
      await expect(getAttachmentPreview(page)).toContainText(
        "Cannot load selection",
      )
    })

    test("inserts pasted files at the cursor position and keeps the cursor after the command", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("HelloWorld")
      await getMessageEditor(page).evaluate((textarea) => {
        const editor = textarea as HTMLTextAreaElement
        editor.setSelectionRange(5, 5)
      })

      await pasteFiles(page, [
        {
          name: "pasted.txt",
          mimeType: "text/plain",
          content: "Paste content",
        },
      ])

      await expect(getMessageEditor(page)).toHaveValue(
        "Hello #file:pasted.txt World",
      )
      await expect(getAttachmentBadge(page, "pasted.txt")).toBeVisible()

      const selectionRange = await getMessageEditor(page).evaluate(
        (textarea) => {
          const editor = textarea as HTMLTextAreaElement

          return {
            start: editor.selectionStart,
            end: editor.selectionEnd,
          }
        },
      )

      expect(selectionRange).toEqual({ start: 23, end: 23 })
    })

    test("renders image previews for image attachments", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await attachFiles(page, {
        name: "diagram.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sY1koQAAAAASUVORK5CYII=",
          "base64",
        ),
      })

      await openAttachmentPreview(page, "diagram.png")
      await expect(page.getByTestId("attachment-preview-image")).toBeVisible()
    })

    test("sends binary attachments even when they have no preview", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("Attach a pdf")
      await attachFiles(page, {
        name: "spec.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("fake-pdf"),
      })
      await selectModel(page, "gpt-4.1")
      await getSendMessageButton(page).click()

      await expect.poll(() => sendCalls.length).toBe(1)
      expect(sendCalls[0]?.[1].attachments[0]).toMatchObject({
        mediaType: "application/pdf",
        name: "spec.pdf",
        type: "file",
      })
    })

    test("shows a toast when file reading fails", async ({ sidepanelPage }) => {
      await sidepanelPage.page.addInitScript(() => {
        const originalText = File.prototype.text

        File.prototype.text = function () {
          if (this.name === "broken.txt") {
            return Promise.reject(new Error("Cannot read broken.txt"))
          }

          return originalText.call(this)
        }
      })

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await attachFiles(page, {
        name: "broken.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("broken"),
      })

      await expect(getLatestToast(page)).toHaveText(
        "Error attaching files: Cannot read broken.txt",
      )
    })
  })

  test.describe("editor autocomplete", () => {
    test("supports keyboard navigation, closes on escape, and resets selection on reopen", async ({
      sidepanelPage,
    }) => {
      commands = [
        {
          id: "cmd-1",
          name: "alpha",
          prompt: "Alpha prompt",
          builtin: false,
        },
        {
          id: "cmd-2",
          name: "beta",
          prompt: "Beta prompt",
          builtin: false,
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("/")

      await expect(getEditorAutocompleteOption(page, "/alpha")).toBeVisible()
      await getMessageEditor(page).press("ArrowDown")
      await getMessageEditor(page).press("ArrowUp")
      await getMessageEditor(page).press("Escape")

      await expect(
        getEditorAutocompleteOption(page, "/alpha"),
      ).not.toBeVisible()

      await getModelSelector(page).focus()
      await getMessageEditor(page).focus()
      await getMessageEditor(page).press("Enter")

      await expect(getMessageEditor(page)).toHaveValue("/alpha ")

      const selectionRange = await getMessageEditor(page).evaluate(
        (textarea) => {
          const editor = textarea as HTMLTextAreaElement

          return {
            start: editor.selectionStart,
            end: editor.selectionEnd,
          }
        },
      )

      expect(selectionRange).toEqual({ start: 7, end: 7 })
    })

    test("selects hash autocomplete options with Tab", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #")
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")
    })

    test("undoes a slash command inserted from autocomplete", async ({
      sidepanelPage,
    }) => {
      commands = [
        {
          id: "cmd-1",
          name: "alpha",
          prompt: "Alpha prompt",
          builtin: false,
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("/")
      await expect(getEditorAutocompleteOption(page, "/alpha")).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("/alpha ")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("/")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("")

      await getMessageEditor(page).press("Control+y")
      await expect(getMessageEditor(page)).toHaveValue("/")
    })

    test("undoes a hash command inserted from autocomplete", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #")
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("See #")
    })

    test("undoes a hash command inserted by clicking the autocomplete option", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #")
      const option = getEditorAutocompleteOption(page, "#page:Alpha_Page")
      await expect(option).toBeVisible()
      await option.click()

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("See #")
    })

    test("undoes an autocomplete expansion of a partial query", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #pag")
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("See #pag")
    })

    test("keeps caret inside the text after undoing an autocomplete insertion", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #")
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      const caretAfterInsert = await getMessageEditor(page).evaluate(
        (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
      )
      await getMessageEditor(page).press("Control+z")

      const caretAfterUndo = await getMessageEditor(page).evaluate(
        (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
      )

      expect(caretAfterInsert).toBe("See #page:Alpha_Page ".length)
      expect(caretAfterUndo).toBe("See #".length)

      // Redo should restore the insertion and place the caret at its end.
      await getMessageEditor(page).press("Control+Shift+z")

      expect(await getMessageEditor(page).inputValue()).toBe(
        "See #page:Alpha_Page ",
      )
      const caretAfterRedo = await getMessageEditor(page).evaluate(
        (textarea) => (textarea as HTMLTextAreaElement).selectionStart,
      )
      expect(caretAfterRedo).toBe("See #page:Alpha_Page ".length)
    })

    test("undoes autocomplete insert via Cmd+Z on macOS-style typing", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).pressSequentially("See #", { delay: 10 })
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      await getMessageEditor(page).press("Meta+z")
      await expect(getMessageEditor(page)).toHaveValue("See #")
    })

    test("undoes autocomplete insert then continues typing and undoes to the start", async ({
      sidepanelPage,
    }) => {
      pages = [
        {
          id: 42,
          title: "Alpha Page",
          url: "https://example.com/alpha",
        },
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).fill("See #")
      await expect(
        getEditorAutocompleteOption(page, "#page:Alpha_Page"),
      ).toBeVisible()
      await getMessageEditor(page).press("Tab")

      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")
      await getMessageEditor(page).type("and more")

      // "and more" is 8 characters typed one-by-one → two batches (5 + 3).
      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue(
        "See #page:Alpha_Page and m",
      )

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("See #page:Alpha_Page ")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("See #")
    })

    test("handles undo, redo, and undo again on a single character", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).press("a")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("")

      await getMessageEditor(page).press("Control+Shift+z")
      await expect(getMessageEditor(page)).toHaveValue("a")

      // Regression: after redo, a subsequent undo must restore "" (not stay
      // stuck on "a").
      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("")

      await getMessageEditor(page).press("Control+Shift+z")
      await expect(getMessageEditor(page)).toHaveValue("a")
    })

    test("undoes consecutive typing in batches of five characters", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await getMessageEditor(page).pressSequentially("abcde", { delay: 10 })
      await expect(getMessageEditor(page)).toHaveValue("abcde")

      await getMessageEditor(page).press("Control+z")
      await expect(getMessageEditor(page)).toHaveValue("")

      await getMessageEditor(page).press("Control+Shift+z")
      await expect(getMessageEditor(page)).toHaveValue("abcde")
    })
  })

  test.describe("tools", () => {
    test("shows an empty state when no tools are available", async ({
      sidepanelPage,
    }) => {
      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)

      await expect(page.getByText("No tools available")).toBeVisible()
    })

    test("hides hidden tools and persists existing chat tool toggles", async ({
      sidepanelPage,
    }) => {
      tools = [
        createTool({ name: "tool-a", defaultEnabled: true }),
        createTool({
          id: "tool-hidden",
          name: "tool-hidden",
          description: "Hidden tool",
          hidden: true,
        }),
      ]
      chats = [
        createChat({
          settings: {
            tools: [{ name: "tool-a", enabled: true }],
          },
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)

      await expect(getToolCheckbox(page, "tool-a")).toBeChecked()
      await expect(page.getByText("tool-hidden")).toHaveCount(0)

      await getToolCheckbox(page, "tool-a").click()

      await expect
        .poll(() => chatSettingsUpdateCalls)
        .toEqual([
          [
            "c1",
            {
              tools: [
                { enabled: false, name: "tool-a" },
                { enabled: true, name: "tool-hidden" },
              ],
            },
          ],
        ])
    })

    test("keeps new-chat tool toggles local and sends them as initial settings", async ({
      sidepanelPage,
    }) => {
      workspaces = [createWorkspace({ lastSelectedChatId: null })]
      chats = []
      tools = [
        createTool({ name: "tool-a", defaultEnabled: true }),
        createTool({
          id: "tool-b",
          name: "tool-b",
          description: "Tool B",
          defaultEnabled: false,
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)
      await getToolCheckbox(page, "tool-b").click()

      expect(chatSettingsUpdateCalls).toEqual([])

      await getMessageEditor(page).fill("Send with local tools")
      await selectModel(page, "gpt-4.1")
      await getSendMessageButton(page).click()

      await expect.poll(() => sendCalls.length).toBe(1)
      expect(sendCalls[0]?.[4]).toEqual({
        tools: [
          { enabled: true, name: "tool-a" },
          { enabled: true, name: "tool-b" },
        ],
      })
    })

    test("shows MCP loading and lets the server toggle hydrate all tools", async ({
      sidepanelPage,
    }) => {
      mcpServers = [createMcpServer()]

      let resolveServerTools!: (value: ModelTool[]) => void

      sidepanelPage.mocks.mcpServerToolsGet = async () =>
        await new Promise<ModelTool[]>((resolve) => {
          resolveServerTools = resolve
        })

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)
      await page.getByRole("button", { name: "Expand Docs tools" }).click()
      await expect(page.getByText("Loading tools...")).toBeVisible()

      resolveServerTools([
        createTool({
          id: "docs-search",
          name: "docs-search",
          description: "Search docs",
        }),
        createTool({
          id: "docs-open",
          name: "docs-open",
          description: "Open docs",
        }),
      ])

      await expect(getMcpServerCheckbox(page, "Docs")).toBeVisible()
      await getMcpServerCheckbox(page, "Docs").click()

      await expect(getToolCheckbox(page, "docs-search")).toBeChecked()
      await expect(getToolCheckbox(page, "docs-open")).toBeChecked()

      await getMcpServerCheckbox(page, "Docs").click()
      await expect(getToolCheckbox(page, "docs-search")).not.toBeChecked()
      await expect(getToolCheckbox(page, "docs-open")).not.toBeChecked()
    })

    test("shows MCP loading errors and supports collapsing the group", async ({
      sidepanelPage,
    }) => {
      mcpServers = [createMcpServer()]
      sidepanelPage.mocks.mcpServerToolsGet = async () => {
        throw new Error("Failed to load MCP server tools.")
      }

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)

      await expect(page.getByLabel("MCP server error")).toBeVisible()
      await page.getByRole("button", { name: "Expand Docs tools" }).click()
      await expect(
        page.getByText("Failed to load MCP server tools."),
      ).toBeVisible()

      await page.getByRole("button", { name: "Collapse Docs tools" }).click()
      await expect(
        page.getByText("Failed to load MCP server tools."),
      ).not.toBeVisible()
    })

    test("rehydrates tool state from the selected chat settings", async ({
      sidepanelPage,
    }) => {
      tools = [createTool({ name: "tool-a", defaultEnabled: true })]
      chats = [
        createChat({
          id: "c1",
          title: "Chat 1",
          settings: { tools: [{ name: "tool-a", enabled: false }] },
        }),
        createChat({
          id: "c2",
          title: "Chat 2",
          settings: { tools: [{ name: "tool-a", enabled: true }] },
          updatedAt: Date.now() - 1000,
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openToolsPopover(page)
      await expect(getToolCheckbox(page, "tool-a")).not.toBeChecked()

      await page.getByRole("button", { name: "C2" }).click()
      await openToolsPopover(page)
      await expect(getToolCheckbox(page, "tool-a")).toBeChecked()
    })
  })

  test.describe("todo list", () => {
    test("shows only when the selected chat has parsed todo items", async ({
      sidepanelPage,
    }) => {
      chats = [createChat({ todoList: "plain text only" })]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getTodoList(page)).toHaveCount(0)
    })

    test("shows the in-progress label, progress counter, and completed state", async ({
      sidepanelPage,
    }) => {
      chats = [
        createChat({
          todoList: ["- [x] done", "- [-] active", "- [ ] pending"].join("\n"),
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)

      await expect(getTodoList(page)).toBeVisible()
      await expect(getTodoListTrigger(page)).toContainText("active")
      await expect(page.getByTestId("todo-list-counter")).toHaveText("1/3")

      chats = [
        createChat({
          todoList: ["- [x] done", "- [x] finished"].join("\n"),
        }),
      ]

      await page.reload()

      await expect(getTodoListTrigger(page)).toContainText(
        "All tasks completed",
      )
      await expect(getTodoListTrigger(page)).toHaveAttribute(
        "data-complete",
        "true",
      )
    })

    test("clears the todo list and closes the popover", async ({
      sidepanelPage,
    }) => {
      chats = [
        createChat({ todoList: ["- [ ] first", "- [ ] second"].join("\n") }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openTodoList(page)
      await expect(getTodoListItems(page)).toHaveCount(2)

      await getTodoListClearButton(page).click()

      await expect.poll(() => chatTodoListClearCalls).toEqual(["c1"])
      await expect(getTodoList(page)).toHaveCount(0)
    })

    test("limits the visible todo items to five rows before scrolling", async ({
      sidepanelPage,
    }) => {
      chats = [
        createChat({
          todoList: Array.from(
            { length: 6 },
            (_, index) => `- [ ] task ${index + 1}`,
          ).join("\n"),
        }),
      ]

      const page = sidepanelPage.page

      await openBottomBar(sidepanelPage)
      await openTodoList(page)

      const maxHeight = await getTodoListItems(page)
        .first()
        .evaluate((item) => (item.parentElement as HTMLElement).style.maxHeight)

      expect(maxHeight).toBe("120px")
    })
  })
})
