import type { ModelTool } from "../../../src/shared/api"
import { expect, test } from "../../fixtures"
import {
  getMcpServerCheckbox,
  getMessageEditor,
  getToolCheckbox,
  getSendMessageButton,
  openToolsPopover,
  selectModel,
} from "../utils/footer"
import {
  createChat,
  createMcpServer,
  createTool,
  createWorkspace,
  openBottomBar,
  setupFooterMocks,
} from "./helpers"

test.describe("tools", () => {
  test("shows an empty state when no tools are available", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)

    await expect(page.getByText("No tools available")).toBeVisible()
  })

  test("hides hidden tools and persists existing chat tool toggles", async ({
    sidepanelPage,
  }) => {
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.tools = [
      createTool({ name: "tool-a", defaultEnabled: true }),
      createTool({
        id: "tool-hidden",
        name: "tool-hidden",
        description: "Hidden tool",
        hidden: true,
      }),
    ]
    state.chats = [
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
      .poll(() => recorders.chatSettingsUpdateCalls)
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
    const { state, recorders } = setupFooterMocks(sidepanelPage)
    state.workspaces = [createWorkspace({ lastSelectedChatId: null })]
    state.chats = []
    state.tools = [
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

    expect(recorders.chatSettingsUpdateCalls).toEqual([])

    await getMessageEditor(page).fill("Send with local tools")
    await selectModel(page, "gpt-4.1")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)
    expect(recorders.sendCalls[0]?.[4]).toEqual({
      tools: [
        { enabled: true, name: "tool-a" },
        { enabled: true, name: "tool-b" },
      ],
    })
  })

  test("shows MCP loading and lets the server toggle hydrate all tools", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.mcpServers = [createMcpServer()]

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
    const { state } = setupFooterMocks(sidepanelPage)
    state.mcpServers = [createMcpServer()]
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
    const { state } = setupFooterMocks(sidepanelPage)
    state.tools = [createTool({ name: "tool-a", defaultEnabled: true })]
    state.chats = [
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
