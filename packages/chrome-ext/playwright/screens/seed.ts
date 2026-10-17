import type {
  Chat,
  McpServer,
  MessageRun,
  ModelProviderModel,
  ModelTool,
  Prompt,
  Workspace,
} from "@pilot43/protocol"

import type { MockedApi } from "../fixtures"

const now = Date.now()
const minute = 60_000

export const workspaces: Workspace[] = [
  {
    color: "blue",
    id: "w1",
    lastSelectedChatId: "c1",
    mcpServers: ["github", "linear"],
    name: "Product Research",
    systemPrompt:
      "You are a product research assistant. Cite sources, prefer primary data, and summarise findings as short bullet lists.",
    toolPermissions: {
      mcp: {
        github: {
          level: "ask",
          tools: { mcp__github__search_issues: "allow" },
        },
      },
    },
  },
  { color: "violet", id: "w2", lastSelectedChatId: null, name: "Personal" },
  {
    color: "orange",
    id: "w3",
    lastSelectedChatId: null,
    name: "Acme Engineering",
  },
]

export const chats: Chat[] = [
  {
    createdAt: now - 10 * minute,
    id: "c4",
    settings: { tools: [{ enabled: true, name: "mcp__github" }] },
    title: "Post release comment",
    todoList:
      "- [x] Read issue #142 and reproduce the timeout\n- [x] Find the export path\n- [-] Add chunked export for frames over 4096 px\n- [ ] Add a regression test\n- [ ] Open a PR against main",
    updatedAt: now - 5 * minute,
    workspaceId: "w1",
  },
  {
    createdAt: now - 12 * minute,
    id: "c5",
    settings: { tools: [] },
    title: "Release questions",
    updatedAt: now - 6 * minute,
    workspaceId: "w1",
  },
  {
    createdAt: now - 30 * minute,
    id: "c1",
    settings: { tools: [] },
    title: "Pricing issues triage",
    updatedAt: now - 2 * minute,
    workspaceId: "w1",
  },
  {
    createdAt: now - 3 * 60 * minute,
    id: "c2",
    settings: { pinned: true, tools: [] },
    title: "Competitor pricing pages",
    updatedAt: now - 60 * minute,
    workspaceId: "w1",
  },
  {
    createdAt: now - 26 * 60 * minute,
    id: "c3",
    settings: { tools: [] },
    title: "Interview notes summary",
    updatedAt: now - 25 * 60 * minute,
    workspaceId: "w1",
  },
]

const searchIssuesResult = {
  items: [
    {
      labels: ["pricing", "api"],
      number: 482,
      state: "open",
      title: "Usage tiers for API plan",
    },
    {
      labels: ["pricing"],
      number: 477,
      state: "open",
      title: "Free tier limits unclear",
    },
    {
      labels: ["pricing"],
      number: 469,
      state: "open",
      title: "Seat-based add-on pricing",
    },
  ],
  total_count: 7,
}

export const messageRuns: Record<string, MessageRun[]> = {
  c1: [
    {
      assistantMessages: [
        {
          content:
            "I found **7 open issues** labelled `pricing`. The most discussed ones are:\n\n1. **#482 Usage tiers for API plan** — customers want a cheaper entry tier.\n2. **#477 Free tier limits unclear** — the limits page contradicts the app.\n3. **#469 Seat-based add-on pricing** — sales asks for per-seat add-ons.\n\nWant me to draft a summary comment for the pricing epic?",
          createdAt: now - 2 * minute,
          id: "am1",
          messageRunId: "mr1",
          role: "assistant",
          tokenCount: 2410,
          tools: [
            {
              args: {
                limit: 10,
                query: "is:open label:pricing",
                repo: "acme/web",
              },
              id: "t1",
              name: "mcp__github__search_issues",
              result: searchIssuesResult,
            },
          ],
        },
      ],
      chatId: "c1",
      createdAt: now - 3 * minute,
      error: null,
      id: "mr1",
      modelMeta: {
        name: "gpt-5",
        provider: "p1",
        settings: { reasoningEffort: "medium" },
      },
      status: "completed",
      updatedAt: now - 2 * minute,
      userMessage: {
        attachments: [],
        content:
          "Find open GitHub issues about pricing in acme/web and summarise them.",
        createdAt: now - 3 * minute,
        id: "um1",
        messageRunId: "mr1",
        role: "user",
        tokenCount: 38,
      },
    },
  ],
}

const baseRun = (id: string, chatId: string, content: string) => ({
  chatId,
  createdAt: now - 4 * minute,
  error: null,
  id,
  modelMeta: { name: "gpt-5", provider: "p1", settings: {} },
  updatedAt: now - 3 * minute,
  userMessage: {
    attachments: [],
    content,
    createdAt: now - 4 * minute,
    id: `${id}-user`,
    messageRunId: id,
    role: "user" as const,
  },
})

messageRuns.c4 = [
  {
    ...baseRun("mr4", "c4", "Looks good — post it as a comment on #142."),
    assistantMessages: [
      {
        content: "Here's the comment I'll post on acme/figma-mcp#142:",
        createdAt: now - 3 * minute,
        id: "am4",
        messageRunId: "mr4",
        role: "assistant",
        tools: [
          {
            approval: "allowed",
            args: { query: "is:open label:bug", repo: "acme/figma-mcp" },
            durationMs: 812,
            id: "t40",
            name: "mcp__github__search_issues",
            result: { items: [1, 2, 3, 4, 5, 6, 7], ok: true },
            startedAt: now - 3 * minute,
            status: "completed",
          },
          {
            args: {
              body: "Thanks for the detailed report! A fix is in #145.",
              issue_number: 142,
              owner: "acme",
              repo: "figma-mcp",
            },
            id: "t41",
            name: "mcp__github__add_issue_comment",
            result: null,
            status: "awaiting_approval",
          },
        ],
      },
    ],
    status: "awaiting_input",
    toolApproval: {
      server: "github",
      toolCallId: "t41",
      toolName: "mcp__github__add_issue_comment",
    },
  },
]

messageRuns.c5 = [
  {
    ...baseRun("mr5", "c5", "Ship the timeout fix as a release."),
    assistantMessages: [
      {
        content: "Before I create the release, a few quick questions:",
        createdAt: now - 3 * minute,
        id: "am5",
        messageRunId: "mr5",
        role: "assistant",
        tools: [],
      },
    ],
    followupQuestion: {
      followUp: [],
      question: "Which branch should the PR target?",
      questions: [
        {
          header: "Branch",
          multiple: false,
          options: [{ label: "main", recommended: true }, { label: "develop" }],
          question: "Which branch should the PR target?",
        },
        {
          header: "Release type",
          multiple: false,
          options: [
            {
              description: "Bug fixes only, no API changes",
              label: "Patch · v0.9.2",
              recommended: true,
            },
            {
              description: "Includes new tools or options",
              label: "Minor · v0.10.0",
            },
          ],
          question: "What kind of release is this?",
        },
        {
          header: "Notes",
          multiple: true,
          options: [
            {
              description: "One-line description of the timeout fix",
              label: "Fix summary",
            },
            { label: "Link to issue #142" },
          ],
          question: "What should the release notes include?",
        },
      ],
    },
    status: "awaiting_input",
  },
]

messageRuns.c3 = [
  {
    ...baseRun("mr3", "c3", "Summarise this week's interview notes."),
    assistantMessages: [
      {
        content:
          "I read all 6 interview notes and grouped the findings into four themes. The full report is attached:",
        createdAt: now - 3 * minute,
        id: "am3",
        messageRunId: "mr3",
        role: "assistant",
        tools: [
          {
            args: { content: "# Themes", filename: "interview-themes.md" },
            id: "t30",
            name: "generate_file",
            result: {
              fileId: "f1",
              filename: "interview-themes.md",
              mimeType: "text/markdown",
              ok: true,
              size: 4300,
            },
            status: "completed",
          },
          {
            args: { node: "12:4" },
            durationMs: 410,
            id: "t31",
            name: "mcp__figma__get_screenshot",
            result: {
              error:
                'MCP error -32001: access token expired. Re-authenticate the "figma" server to continue.',
              ok: false,
            },
            status: "failed",
          },
        ],
      },
    ],
    continuationPrompt: {
      kind: "rate_limit",
      message: "OpenAI rate limit reached (429). Wait a moment, then continue.",
    },
    status: "awaiting_input",
  },
]

export const providers = [
  {
    id: "p1",
    models: {
      "gpt-5": {
        reasoning: {
          defaultEffort: "medium",
          supportedEfforts: ["minimal", "low", "medium", "high"],
        },
      },
    },
    name: "OpenAI",
    settings: { apiKey: "sk-proj-test91c0" },
    type: "openai" as const,
  },
  {
    id: "p2",
    name: "OpenRouter",
    settings: { apiKey: "sk-or-test" },
    type: "openrouter" as const,
  },
  {
    id: "p3",
    name: "Ollama",
    settings: { host: "http://localhost:11434" },
    type: "ollama" as const,
  },
]

export const models: Record<string, ModelProviderModel[]> = {
  p1: [
    {
      id: "p1::gpt-5",
      name: "gpt-5",
      providerId: "p1",
      reasoning: {
        defaultEffort: "medium",
        mandatory: false,
        supportedEfforts: ["minimal", "low", "medium", "high"],
      },
    },
    { id: "p1::gpt-4.1", name: "gpt-4.1", providerId: "p1" },
  ],
  p2: [
    {
      id: "p2::anthropic/claude-opus-5.5",
      name: "anthropic/claude-opus-5.5",
      providerId: "p2",
      reasoning: {
        defaultEffort: "high",
        mandatory: false,
        supportedEfforts: ["low", "medium", "high"],
      },
    },
  ],
  p3: [{ id: "p3::qwen3:14b", name: "qwen3:14b", providerId: "p3" }],
}

export const tools: ModelTool[] = [
  {
    description: "Reads the content of a web page.",
    id: "read_webpage",
    name: "read_webpage",
    shortDescription: "Read a web page",
  },
  {
    description: "Runs JavaScript in the page.",
    id: "run_js",
    name: "run_js",
    shortDescription: "Run JavaScript on the page",
  },
  {
    description: "Asks the user a question.",
    hidden: true,
    id: "ask_followup_question",
    name: "ask_followup_question",
  },
]

export const mcpServers: McpServer[] = [
  { name: "github", type: "http", url: "https://api.githubcopilot.com/mcp/" },
  { name: "linear", type: "http", url: "https://mcp.linear.app/mcp" },
]

export const prompts: Prompt[] = [
  {
    builtin: false,
    id: "p1",
    text: "Summarize the current tab in 5 bullet points.\n\nThen list any open questions or claims that need a source.",
    title: "Summarize page",
  },
  {
    builtin: false,
    id: "p2",
    text: "Turn my notes into a standup update: Yesterday, Today, Blockers. Keep it under 80 words.",
    title: "Standup summary",
  },
  {
    builtin: false,
    id: "p3",
    text: "Review this diff for bugs, edge cases and naming. Group findings by severity.",
    title: "Code review",
  },
]

/** Installs seeded handlers on the mocked backend. */
export function seedMocks(mocks: MockedApi) {
  let workspaceList = [...workspaces]
  let chatList = [...chats]

  mocks.appSettingsGet = async () => ({
    id: "app",
    mcpServers,
    titleGenerationModel: "use-chat-model",
  })
  mocks.appSettingsUpdate = async (settings) => settings
  mocks.workspaceGet = async () => workspaceList
  mocks.workspaceUpdate = async (workspace) => {
    workspaceList = workspaceList.map((w) =>
      w.id === workspace.id ? workspace : w,
    )
    return workspace
  }
  mocks.workspaceCreate = async (workspace) => {
    const created = {
      ...workspace,
      id: `w${workspaceList.length + 1}`,
      lastSelectedChatId: null,
    }
    workspaceList = [...workspaceList, created]
    return created
  }
  mocks.workspaceDelete = async (id) => {
    workspaceList = workspaceList.filter((w) => w.id !== id)
  }
  mocks.chatGetByWorkspace = async (workspaceId) =>
    chatList.filter((chat) => chat.workspaceId === workspaceId)
  mocks.chatDelete = async (id) => {
    chatList = chatList.filter((chat) => chat.id !== id)
  }
  mocks.chatMessageRunGet = async (chatId) => messageRuns[chatId] ?? []
  mocks.chatTokenEstimateGet = async () => 12_400
  mocks.chatSettingsUpdate = async (chatId, settings) => {
    chatList = chatList.map((chat) =>
      chat.id === chatId ? { ...chat, settings } : chat,
    )
    return chatList.find((chat) => chat.id === chatId)!
  }
  mocks.chatTitleUpdate = async (chatId, title) => {
    chatList = chatList.map((chat) =>
      chat.id === chatId ? { ...chat, title } : chat,
    )
    return chatList.find((chat) => chat.id === chatId)!
  }
  mocks.modelProviderTypeGet = async () => [
    { name: "OpenAI", type: "openai" },
    { name: "OpenRouter", type: "openrouter" },
    { name: "Ollama", type: "ollama" },
  ]
  mocks.modelProviderGet = async () => providers
  mocks.modelProviderModelGet = async (providerId) => models[providerId] ?? []
  mocks.modelProviderCheck = async (provider) =>
    provider.type === "ollama"
      ? { message: "fetch failed", success: false }
      : {
          latencyMs: 312,
          message: "Connected",
          models: (models[provider.id] ?? []).map((model) => model.name),
          success: true,
        }
  mocks.modelToolGet = async () => tools
  mocks.mcpServerGet = async () => mcpServers
  mocks.mcpServerToolsGet = async (server) =>
    server.name === "github"
      ? [
          {
            description: "Search issues",
            group: "github",
            id: "mcp__github__search_issues",
            name: "mcp__github__search_issues",
            shortDescription: "Search issues and pull requests",
          },
          {
            description: "Get an issue",
            group: "github",
            id: "mcp__github__get_issue",
            name: "mcp__github__get_issue",
            shortDescription: "Get issue details",
          },
        ]
      : [
          {
            description: "Search issues",
            group: "linear",
            id: "mcp__linear__search_issues",
            name: "mcp__linear__search_issues",
            shortDescription: "Search Linear issues",
          },
        ]
  mocks.promptGet = async () => prompts
  mocks.pageContentGet = async () => [
    {
      id: 1,
      title: "Q3 roadmap — Linear",
      url: "https://linear.app/acme/roadmap/q3",
    },
    {
      id: 2,
      title: "Interview notes — Google Docs",
      url: "https://docs.google.com/document/d/1",
    },
  ]
  mocks.pageContentSelectionGet = async () => null
}
