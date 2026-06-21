import type { Page } from "@playwright/test"

import type {
  ApiClient,
  Chat,
  MessageRun,
  MessageUser,
  ModelProviderModel,
  OpenAIModelProvider,
  PageContent,
  PageContentSelection,
  Workspace,
} from "../../src/shared/api"
import { expect, test } from "../fixtures"

interface MockOptions {
  chats?: Chat[]
  messageRuns?: MessageRun[]
  models?: ModelProviderModel[]
  overrides?: Partial<ApiClient>
  pageContents?: PageContent[]
  providers?: OpenAIModelProvider[]
  selection?: null | PageContentSelection
  workspaces?: Workspace[]
}

interface ChatMessageSendCall {
  chatId: Chat["id"]
  message: Pick<MessageUser, "attachments" | "content">
  model: Pick<ModelProviderModel, "name" | "providerId">
  workspaceId: Workspace["id"]
}

const provider = createProvider()
const model = createModel()

test.describe.skip("bottom bar", () => {
  test("disables sending until workspace, text, and model are ready", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    const sendButton = sidepanelPage.page.getByRole("button", {
      name: "Send message",
    })

    await expect(sendButton).toBeDisabled()

    await selectWorkspace(sidepanelPage.page, workspace.name)

    await expect(sendButton).toBeDisabled()

    await sidepanelPage.page
      .getByPlaceholder("Type a message...")
      .fill("Explain the current workspace")

    await expect(sendButton).toBeDisabled()

    await selectModel(sidepanelPage.page, model.name)

    await expect(sendButton).toBeEnabled()
  })

  test("refreshes page commands after a page context update notification", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    let pageContents = [
      createPageContent(),
      createPageContent({
        id: 84,
        title: "Release Notes",
        url: "https://example.com/release-notes",
      }),
    ]

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        pageContentGet: async () =>
          pageContents.map(({ id, title, url }) => ({ id, title, url })),
        pageContentGetById: async (id) => {
          const pageContent = pageContents.find((entry) => entry.id === id)

          if (!pageContent) {
            throw new Error(`Page content not found: ${id}`)
          }

          return pageContent
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    const editor = sidepanelPage.page.getByPlaceholder("Type a message...")

    await editor.click()
    await editor.pressSequentially("#page")

    await expect(sidepanelPage.page.getByRole("option")).toHaveText([
      "#page:Docs_Page",
      "#page:Release_Notes",
    ])

    pageContents = [
      createPageContent({
        id: 84,
        title: "Current Article",
        url: "https://example.com/current-article",
      }),
      createPageContent({
        id: 42,
        title: "Archived Docs",
        url: "https://example.com/archived-docs",
      }),
    ]

    await notifyPageContextUpdated(sidepanelPage.page)

    await expect(sidepanelPage.page.getByRole("option")).toHaveText([
      "#page:Current_Article",
      "#page:Archived_Docs",
    ])
  })

  test("keeps attached page snapshots after the tab content changes", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    let pageContents = [createPageContent()]
    let sendCall: ChatMessageSendCall | null = null

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        chatMessageSend: async (
          chatId,
          message,
          selectedModel,
          workspaceId,
        ) => {
          sendCall = {
            chatId,
            message,
            model: selectedModel,
            workspaceId,
          }

          return {
            id: "message-user-1",
            messageRunId: "message-run-1",
            content: message.content,
            role: "user",
            createdAt: Date.now(),
            attachments: message.attachments,
          }
        },
        pageContentGet: async () =>
          pageContents.map(({ id, title, url }) => ({ id, title, url })),
        pageContentGetById: async (id) => {
          const pageContent = pageContents.find((entry) => entry.id === id)

          if (!pageContent) {
            throw new Error(`Page content not found: ${id}`)
          }

          return pageContent
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await insertCommand(sidepanelPage.page, "#page", "#page:Docs_Page")

    await expect(
      sidepanelPage.page.getByRole("button", { name: "Docs Page" }),
    ).toBeVisible()

    pageContents = [
      createPageContent({
        content: "Current article content",
        excerpt: "Current article excerpt",
        id: 42,
        textContent: "Current article content",
        title: "Current Article",
        url: "https://example.com/current-article",
      }),
    ]

    await notifyPageContextUpdated(sidepanelPage.page, "tabUpdated")
    await insertCommand(sidepanelPage.page, "#page", "#page:Current_Article")

    await sidepanelPage.page.getByPlaceholder("Type a message...").focus()
    await sidepanelPage.page.keyboard.type(" Compare both snapshots")
    await sidepanelPage.page
      .getByRole("button", { name: "Send message" })
      .click()

    await expect.poll(() => sendCall?.message.attachments?.length).toBe(2)

    expect(sendCall?.message.attachments).toMatchObject([
      {
        content: "Documentation content",
        id: 42,
        title: "Docs Page",
        type: "page-content",
        url: "https://example.com/docs",
      },
      {
        content: "Current article content",
        id: 42,
        title: "Current Article",
        type: "page-content",
        url: "https://example.com/current-article",
      },
    ])
  })

  test("shows the stored token total plus the current draft estimate", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        chatTokenEstimateGet: async () => 120,
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await expect(sidepanelPage.page.getByTestId("token-estimation")).toHaveText(
      "120 tok",
    )

    await sidepanelPage.page.getByPlaceholder("Type a message...").fill("Hi")

    await expect(sidepanelPage.page.getByTestId("token-estimation")).toHaveText(
      "~121 tok",
    )
  })

  test("disables sending while an attachment is loading and after it fails", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    const pageContent = createPageContent()
    let rejectPageContent!: (reason?: unknown) => void

    const pageContentRequest = new Promise<PageContent>((_resolve, reject) => {
      rejectPageContent = reject
    })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        pageContentGetById: async () => await pageContentRequest,
      },
      pageContents: [pageContent],
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await sidepanelPage.page
      .getByPlaceholder("Type a message...")
      .fill("#page:42")

    const sendButton = sidepanelPage.page.getByRole("button", {
      name: "Send message",
    })

    await expect(
      sidepanelPage.page.getByRole("button", { name: "loading..." }),
    ).toBeVisible()
    await expect(sendButton).toBeDisabled()

    rejectPageContent(new Error("Cannot load page content"))

    await expect(
      sidepanelPage.page.getByRole("button", { name: "loading..." }),
    ).not.toBeVisible()
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Page" }),
    ).toHaveAttribute("data-variant", "error")
    await expect(sendButton).toBeDisabled()

    await sidepanelPage.page.getByRole("button", { name: "Page" }).click()

    await expect(
      sidepanelPage.page.getByRole("dialog", {
        name: "Page attachment preview",
      }),
    ).toContainText("Cannot load page content")

    await expect(
      sidepanelPage.page
        .getByTestId("editor-command-token")
        .filter({ hasText: "#page:42" }),
    ).toHaveAttribute("data-has-error", "true")
  })

  test("shows selection attachment errors in the badge preview and editor", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        pageContentSelectionGet: async () => {
          throw new Error("Cannot load selection")
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await sidepanelPage.page
      .getByPlaceholder("Type a message...")
      .fill("#selection:Selected_text")

    await expect(
      sidepanelPage.page.getByRole("button", { name: "Selection" }),
    ).toHaveAttribute("data-variant", "error")
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Send message" }),
    ).toBeDisabled()

    await sidepanelPage.page.getByRole("button", { name: "Selection" }).click()

    await expect(
      sidepanelPage.page.getByRole("dialog", {
        name: "Selection attachment preview",
      }),
    ).toContainText("Cannot load selection")

    await expect(
      sidepanelPage.page
        .getByTestId("editor-command-token")
        .filter({ hasText: "#selection:Selected_text" }),
    ).toHaveAttribute("data-has-error", "true")
  })

  test("keeps selection attachments as snapshots after the selection is cleared", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    let selection: null | PageContentSelection = createSelection()

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        pageContentSelectionGet: async () => selection,
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await insertCommand(
      sidepanelPage.page,
      "#selection",
      "#selection:Selected_text",
    )

    const sendButton = sidepanelPage.page.getByRole("button", {
      name: "Send message",
    })

    await expect(
      sidepanelPage.page.getByRole("button", { name: "Selected snippet" }),
    ).toBeVisible()
    await expect(sendButton).toBeEnabled()

    selection = null

    await notifyPageContextUpdated(sidepanelPage.page, "selectionChanged")

    await expect(
      sidepanelPage.page.getByRole("button", { name: "Selected snippet" }),
    ).toBeVisible()
    await expect(sendButton).toBeEnabled()

    await sidepanelPage.page
      .getByPlaceholder("Type a message...")
      .fill("#selection")

    await expect(
      sidepanelPage.page.getByRole("option", {
        name: "#selection:no_selection",
      }),
    ).toBeDisabled()
  })

  test("attaches files from the picker and paste with the expected previews", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    const textAttachmentContent = `${"A".repeat(995)}HELLOTAIL`
    let sendCall: ChatMessageSendCall | null = null

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        chatMessageSend: async (
          chatId,
          message,
          selectedModel,
          workspaceId,
        ) => {
          sendCall = {
            chatId,
            message,
            model: selectedModel,
            workspaceId,
          }

          return {
            id: "message-user-1",
            messageRunId: "message-run-1",
            content: message.content,
            role: "user",
            createdAt: Date.now(),
            attachments: message.attachments,
          }
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Attach files" }),
    ).toBeVisible()

    await pasteFiles(sidepanelPage.page, [
      {
        mimeType: "text/plain",
        name: "notes.txt",
        text: textAttachmentContent,
      },
    ])

    await expect(
      sidepanelPage.page.getByRole("button", { name: "notes.txt" }),
    ).toBeVisible()

    const [fileChooser] = await Promise.all([
      sidepanelPage.page.waitForEvent("filechooser"),
      sidepanelPage.page.getByRole("button", { name: "Attach files" }).click(),
    ])

    await fileChooser.setFiles([
      {
        buffer: createPngBuffer(),
        mimeType: "image/png",
        name: "preview.png",
      },
      {
        buffer: Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
        ),
        mimeType: "application/pdf",
        name: "report.pdf",
      },
    ])

    await expect(
      sidepanelPage.page.getByRole("button", { name: "preview.png" }),
    ).toBeVisible()
    await expect(
      sidepanelPage.page
        .getByTestId("attachment-badge")
        .filter({ hasText: "report.pdf" }),
    ).toBeVisible()
    await expect(
      sidepanelPage.page.getByRole("button", { name: "report.pdf" }),
    ).toHaveCount(0)

    await sidepanelPage.page.getByRole("button", { name: "notes.txt" }).click()

    const textPreview = sidepanelPage.page.getByRole("dialog", {
      name: "notes.txt attachment preview",
    })

    await expect(textPreview).toContainText("HELLO")
    await expect(textPreview).not.toContainText("TAIL")

    await sidepanelPage.page
      .getByRole("button", { name: "preview.png" })
      .click()

    await expect(
      sidepanelPage.page.getByTestId("attachment-preview-image"),
    ).toBeVisible()

    await sidepanelPage.page.getByPlaceholder("Type a message...").focus()
    await sidepanelPage.page.keyboard.type(" Please inspect the files")
    await sidepanelPage.page
      .getByRole("button", { name: "Send message" })
      .click()

    await expect.poll(() => sendCall?.message.attachments.length).toBe(3)

    const sentAttachments = sendCall?.message.attachments ?? []

    expect(sentAttachments).toMatchObject([
      {
        content: textAttachmentContent,
        mediaType: "text/plain",
        name: "notes.txt",
        type: "file",
      },
      {
        mediaType: "image/png",
        name: "preview.png",
        type: "file",
      },
      {
        mediaType: "application/pdf",
        name: "report.pdf",
        type: "file",
      },
    ])
    expect(sentAttachments[1]?.content).toContain("data:image/png;base64,")
    expect(sentAttachments[2]?.content).toContain(
      "data:application/pdf;base64,",
    )
  })

  test("shows a stop button instead of send while a message run is in progress", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    const pendingRun = createMessageRun({
      chatId: chat.id,
      modelMeta: {
        name: model.name,
        provider: provider.id,
        settings: {},
      },
      status: "pending",
    })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      messageRuns: [pendingRun],
      models: [model],
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Select model" }),
    ).toContainText(model.name)

    // The send button is replaced by the stop button while the latest run is
    // still generating a response.
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Send message" }),
    ).toHaveCount(0)
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Stop generating" }),
    ).toBeVisible()
  })

  test("stops the active message run and restores the send button", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    const pendingRun = createMessageRun({
      chatId: chat.id,
      modelMeta: {
        name: model.name,
        provider: provider.id,
        settings: {},
      },
      status: "pending",
    })

    let stoppedRunId: null | string = null

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      messageRuns: [pendingRun],
      models: [model],
      overrides: {
        chatMessageRunStop: async (id) => {
          stoppedRunId = id
          pendingRun.status = "stopped"
          pendingRun.updatedAt = Date.now()
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)

    await sidepanelPage.page
      .getByRole("button", { name: "Stop generating" })
      .click()

    await expect.poll(() => stoppedRunId).toBe(pendingRun.id)
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Stop generating" }),
    ).toHaveCount(0)
    await expect(
      sidepanelPage.page.getByRole("button", { name: "Send message" }),
    ).toBeVisible()
  })

  test("shows an error toast when sending fails", async ({ sidepanelPage }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        chatMessageSend: async () => {
          throw new Error("Send failed")
        },
      },
      providers: [provider],
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await sidepanelPage.page.getByPlaceholder("Type a message...").fill("Hi")
    await sidepanelPage.page
      .getByRole("button", { name: "Send message" })
      .click()

    await expect(sidepanelPage.page.getByRole("alert")).toHaveText(
      "Error sending message: Send failed",
    )
  })

  test("sends the selected model, identifiers, and resolved attachments", async ({
    sidepanelPage,
  }) => {
    const workspace = createWorkspace()
    const chat = createChat({ workspaceId: workspace.id })
    const pageContent = createPageContent()
    const selection = createSelection({
      id: pageContent.id,
      url: pageContent.url,
    })
    let sendCall: ChatMessageSendCall | null = null

    mockSidepanel(sidepanelPage.mocks, {
      chats: [chat],
      models: [model],
      overrides: {
        chatMessageSend: async (
          chatId,
          message,
          selectedModel,
          workspaceId,
        ) => {
          sendCall = {
            chatId,
            message,
            model: selectedModel,
            workspaceId,
          }

          return {
            id: "message-user-1",
            messageRunId: "message-run-1",
            content: message.content,
            role: "user",
            createdAt: Date.now(),
            attachments: message.attachments,
          }
        },
      },
      pageContents: [pageContent],
      providers: [provider],
      selection,
      workspaces: [workspace],
    })

    await sidepanelPage.open()

    await selectWorkspace(sidepanelPage.page, workspace.name)
    await selectModel(sidepanelPage.page, model.name)
    await insertCommand(sidepanelPage.page, "#page", "#page:Docs_Page")
    await expect(
      sidepanelPage.page.getByRole("button", {
        name: pageContent.title ?? "",
      }),
    ).toBeVisible()

    await sidepanelPage.page
      .getByRole("button", { name: pageContent.title ?? "" })
      .click()

    await expect(
      sidepanelPage.page.getByRole("dialog", {
        name: `${pageContent.title} attachment preview`,
      }),
    ).toContainText(pageContent.content ?? "")

    await insertCommand(
      sidepanelPage.page,
      "#selection",
      "#selection:Selected_text",
    )
    await expect(
      sidepanelPage.page.getByRole("button", { name: selection.title }),
    ).toBeVisible()

    await sidepanelPage.page
      .getByRole("button", { name: selection.title })
      .click()

    await expect(
      sidepanelPage.page.getByRole("dialog", {
        name: `${selection.title} attachment preview`,
      }),
    ).toContainText(selection.content ?? "")

    await sidepanelPage.page.getByPlaceholder("Type a message...").focus()

    const messageText =
      "#page:Docs_Page #selection:Selected_text Please summarize both"

    await sidepanelPage.page.keyboard.type("Please summarize both")
    await sidepanelPage.page
      .getByRole("button", { name: "Send message" })
      .click()

    await expect.poll(() => sendCall?.chatId).toBe(chat.id)

    expect(sendCall).toMatchObject({
      chatId: chat.id,
      message: {
        attachments: [
          {
            content: pageContent.content,
            id: pageContent.id,
            title: pageContent.title,
            type: "page-content",
            url: pageContent.url,
          },
          {
            content: selection.content,
            id: selection.id,
            title: selection.title,
            type: "page-content-selection",
            uniqueKey: selection.uniqueKey,
            url: selection.url,
          },
        ],
        content: messageText,
      },
      model: {
        name: model.name,
        providerId: provider.id,
      },
      workspaceId: workspace.id,
    })
  })
})

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Workspace 1",
    lastSelectedChatId: "chat-1",
    ...overrides,
  }
}

function createChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "chat-1",
    title: "Chat 1",
    workspaceId: "workspace-1",
    settings: { tools: [] },
    ...overrides,
  }
}

function createProvider(
  overrides: Partial<OpenAIModelProvider> = {},
): OpenAIModelProvider {
  const { settings, ...restOverrides } = overrides

  return {
    id: "provider-1",
    name: "OpenAI Primary",
    type: "openai",
    ...restOverrides,
    settings: {
      apiKey: "sk-test",
      host: "https://api.openai.com",
      ...settings,
    },
  }
}

function createModel(
  overrides: Partial<ModelProviderModel> = {},
): ModelProviderModel {
  return {
    id: "provider-1::gpt-4o-mini",
    name: "gpt-4o-mini",
    providerId: "provider-1",
    ...overrides,
  }
}

function createMessageRun(overrides: Partial<MessageRun> = {}): MessageRun {
  return {
    id: "message-run-1",
    chatId: "chat-1",
    userMessage: {
      id: "user-message-1",
      messageRunId: "message-run-1",
      content: "Message",
      role: "user",
      createdAt: Date.now(),
      attachments: [],
    },
    assistantMessages: [],
    status: "completed",
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    modelMeta: {
      name: model.name,
      provider: provider.id,
      settings: {},
    },
    ...overrides,
  }
}

function createPageContent(overrides: Partial<PageContent> = {}): PageContent {
  return {
    id: 42,
    url: "https://example.com/docs",
    title: "Docs Page",
    content: "Documentation content",
    textContent: "Documentation content",
    byline: "",
    dir: "ltr",
    excerpt: "Docs excerpt",
    length: 128,
    siteName: "Example",
    lang: "en",
    publishedTime: "2024-01-01T00:00:00Z",
    ...overrides,
  } as PageContent
}

function createSelection(
  overrides: Partial<PageContentSelection> = {},
): PageContentSelection {
  return {
    id: 42,
    uniqueKey: "selection-1",
    url: "https://example.com/docs",
    title: "Selected snippet",
    description: "Important excerpt",
    content: "Selected text",
    ...overrides,
  }
}

function mockSidepanel(mocks: ApiClient, options: MockOptions = {}) {
  const {
    chats = [],
    messageRuns = [],
    models = [],
    overrides = {},
    pageContents = [],
    providers = [],
    selection = null,
    workspaces = [],
  } = options

  type Mocks = typeof mocks

  Object.assign(mocks, {
    workspaceGet: async () => workspaces,
    chatGetByWorkspace: async (workspaceId) =>
      chats.filter((chat) => chat.workspaceId === workspaceId),
    chatMessageRunGet: async (chatId) =>
      messageRuns.filter((messageRun) => messageRun.chatId === chatId),
    chatTokenEstimateGet: async () => 0,
    modelToolGet: async () => [],
    modelProviderGet: async () => providers,
    modelProviderModelGet: async (providerId) =>
      models.filter((entry) => entry.providerId === providerId),
    pageContentGet: async () =>
      pageContents.map(({ id, title, url }) => ({ id, title, url })),
    pageContentGetById: async (id) => {
      const pageContent = pageContents.find((entry) => entry.id === id)

      if (!pageContent) {
        throw new Error(`Page content not found: ${id}`)
      }

      return pageContent
    },
    pageContentSelectionGet: async () => selection,
    chatMessageSend: async (_chatId, message) => ({
      id: "message-user-1",
      messageRunId: "message-run-1",
      content: message.content,
      role: "user",
      createdAt: Date.now(),
      attachments: message.attachments,
    }),
  } satisfies Partial<Mocks>)

  Object.assign(mocks, overrides)
}

async function selectWorkspace(page: Page, workspaceName: string) {
  await page.getByRole("button", { name: "Select workspace" }).click()
  await page.getByRole("option", { name: workspaceName }).click()
  await expect(page.getByRole("button", { name: workspaceName })).toBeVisible()
}

async function selectModel(page: Page, modelName: string) {
  const modelSelector = page.getByRole("button", { name: "Select model" })

  await modelSelector.click()
  await page.getByRole("option", { name: modelName }).click()
  await expect(modelSelector).toContainText(modelName)
}

async function insertCommand(
  page: Page,
  commandQuery: string,
  optionName: string,
) {
  const editor = page.getByPlaceholder("Type a message...")

  await editor.click()
  await editor.pressSequentially(commandQuery)
  await expect(page.getByRole("option", { name: optionName })).toBeVisible()
  await page.keyboard.press("Enter")
}

async function notifyPageContextUpdated(
  page: Page,
  reason:
    | "selectionChanged"
    | "tabActivated"
    | "tabCreated"
    | "tabRemoved"
    | "tabUpdated" = "tabUpdated",
) {
  let [serviceWorker] = page.context().serviceWorkers()

  if (!serviceWorker) {
    serviceWorker = await page.context().waitForEvent("serviceworker")
  }

  await serviceWorker.evaluate(async (updateReason) => {
    await chrome.runtime.sendMessage({
      target: "sidepanel",
      action: "pageContextUpdated",
      payload: { reason: updateReason },
    })
  }, reason)
}

function createPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0pRXQAAAAASUVORK5CYII=",
    "base64",
  )
}

async function pasteFiles(
  page: Page,
  files: Array<{
    base64?: string
    mimeType: string
    name: string
    text?: string
  }>,
) {
  const editor = page.getByPlaceholder("Type a message...")

  await editor.focus()
  await editor.evaluate((node, payloadFiles) => {
    const dataTransfer = new DataTransfer()

    payloadFiles.forEach((file) => {
      const content = file.base64
        ? Uint8Array.from(atob(file.base64), (character) =>
            character.charCodeAt(0),
          )
        : (file.text ?? "")

      dataTransfer.items.add(
        new File([content], file.name, { type: file.mimeType }),
      )
    })

    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    })

    Object.defineProperty(pasteEvent, "clipboardData", {
      value: dataTransfer,
    })

    node.dispatchEvent(pasteEvent)
  }, files)
}
