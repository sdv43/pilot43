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
} from "../../../src/shared/api"
import { selectWorkspace } from "../utils/workspace"

export function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Workspace 1",
    lastSelectedChatId: "c1",
    ...overrides,
  }
}

export function createChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "c1",
    workspaceId: "w1",
    title: "Chat 1",
    settings: { tools: [] },
    updatedAt: Date.now(),
    ...overrides,
  }
}

export function createProvider(
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

export function createModel(
  overrides: Partial<ModelProviderModel> = {},
): ModelProviderModel {
  return {
    id: "provider-1::gpt-4.1",
    name: "gpt-4.1",
    providerId: "provider-1",
    ...overrides,
  }
}

export function createTool(overrides: Partial<ModelTool> = {}): ModelTool {
  return {
    id: "tool-a",
    name: "tool-a",
    description: "Tool A",
    defaultEnabled: true,
    ...overrides,
  }
}

export function createMcpServer(overrides: Partial<McpServer> = {}): McpServer {
  return {
    name: "Docs",
    type: "http",
    url: "https://example.com/mcp",
    ...overrides,
  }
}

export function createMessageRun(
  overrides: Partial<MessageRun> = {},
): MessageRun {
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

export type ChatMessageSendArgs = Parameters<ApiClient["chatMessageSend"]>

export interface FooterState {
  workspaces: Workspace[]
  chats: Chat[]
  messageRuns: MessageRun[]
  modelProviders: OpenAIModelProvider[]
  modelProviderModels: Record<string, ModelProviderModel[]>
  tools: ModelTool[]
  tokenEstimate: number
  commands: Command[]
  pages: Pick<PageContent, "id" | "title" | "url">[]
  pageById: Record<number, PageContent>
  selection: null | PageContentSelection
  mcpServers: McpServer[]
  mcpServerToolsByName: Record<string, ModelTool[]>
}

export interface FooterRecorders {
  sendCalls: ChatMessageSendArgs[]
  stopCalls: string[]
  chatSettingsUpdateCalls: Parameters<ApiClient["chatSettingsUpdate"]>[]
  chatTodoListClearCalls: string[]
}

function createFooterState(): FooterState {
  return {
    workspaces: [createWorkspace()],
    chats: [createChat()],
    messageRuns: [],
    modelProviders: [
      createProvider(),
      createProvider({ id: "provider-2", name: "Anthropic" }),
    ],
    modelProviderModels: {
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
    },
    tools: [],
    tokenEstimate: 0,
    commands: [],
    pages: [],
    pageById: {},
    selection: null,
    mcpServers: [],
    mcpServerToolsByName: {},
  }
}

function createFooterRecorders(): FooterRecorders {
  return {
    sendCalls: [],
    stopCalls: [],
    chatSettingsUpdateCalls: [],
    chatTodoListClearCalls: [],
  }
}

interface MockedSidepanelPage {
  mocks: ApiClient
  open: () => Promise<void>
  page: Parameters<typeof selectWorkspace>[0]
}

/**
 * Installs all shared bottom-bar mocks driven by a mutable `state` object and
 * returns `{ state, recorders }`. Per-file specs override individual mocks
 * after calling this.
 */
export function setupFooterMocks(sidepanelPage: MockedSidepanelPage): {
  state: FooterState
  recorders: FooterRecorders
} {
  const state = createFooterState()
  const recorders = createFooterRecorders()

  sidepanelPage.mocks.appSettingsGet = async () => ({
    id: "app",
    titleGenerationModel: "disabled",
    titleModel: null,
  })
  sidepanelPage.mocks.workspaceGet = async () => state.workspaces
  sidepanelPage.mocks.workspaceUpdate = async (workspace) => {
    state.workspaces = state.workspaces.map((item) =>
      item.id === workspace.id ? workspace : item,
    )

    return workspace
  }
  sidepanelPage.mocks.chatGetByWorkspace = async (workspaceId) =>
    state.chats.filter((chat) => chat.workspaceId === workspaceId)
  sidepanelPage.mocks.chatMessageRunGet = async (chatId) =>
    state.messageRuns.filter((messageRun) => messageRun.chatId === chatId)
  sidepanelPage.mocks.chatMessageSend = async (...args) => {
    recorders.sendCalls.push(args)

    const [, message] = args

    return {
      id: `um-${recorders.sendCalls.length}`,
      role: "user",
      messageRunId: `mr-${recorders.sendCalls.length}`,
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
    recorders.stopCalls.push(id)
    state.messageRuns = state.messageRuns.map((messageRun) =>
      messageRun.id === id
        ? {
            ...messageRun,
            status: "stopped",
            updatedAt: Date.now(),
          }
        : messageRun,
    )
  }
  sidepanelPage.mocks.chatTokenEstimateGet = async () => state.tokenEstimate
  sidepanelPage.mocks.chatSettingsUpdate = async (chatId, settings) => {
    recorders.chatSettingsUpdateCalls.push([chatId, settings])
    state.chats = state.chats.map((chat) =>
      chat.id === chatId ? { ...chat, settings } : chat,
    )

    return state.chats.find((chat) => chat.id === chatId)!
  }
  sidepanelPage.mocks.modelProviderGet = async () => state.modelProviders
  sidepanelPage.mocks.modelProviderModelGet = async (providerId) =>
    state.modelProviderModels[providerId] ?? []
  sidepanelPage.mocks.modelProviderTypeGet = async () => []
  sidepanelPage.mocks.modelProviderCheck = async () => ({
    success: true,
    message: "ok",
  })
  sidepanelPage.mocks.modelToolGet = async () => state.tools
  sidepanelPage.mocks.commandGet = async () => state.commands
  sidepanelPage.mocks.mcpServerGet = async () => state.mcpServers
  sidepanelPage.mocks.mcpServerToolsGet = async (server) =>
    state.mcpServerToolsByName[server.name] ?? []
  sidepanelPage.mocks.pageContentGet = async () => state.pages
  sidepanelPage.mocks.pageContentGetById = async (id) =>
    state.pageById[id] ?? null
  sidepanelPage.mocks.pageContentSelectionGet = async () => state.selection
  sidepanelPage.mocks.chatTodoListClear = async (chatId) => {
    recorders.chatTodoListClearCalls.push(chatId)
    state.chats = state.chats.map((chat) =>
      chat.id === chatId ? { ...chat, todoList: null } : chat,
    )
  }
  sidepanelPage.mocks.chatDelete = async () => undefined

  return { state, recorders }
}

export async function openBottomBar(
  sidepanelPage: MockedSidepanelPage,
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

export async function notifyPageContextUpdated(sidepanelPage: {
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
