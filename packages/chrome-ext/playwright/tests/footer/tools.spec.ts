import type { ModelTool } from "@pilot43/protocol"
import { expect, test } from "../../fixtures"
import {
  expandToolGroup,
  getMessageEditor,
  getSendMessageButton,
  getToolCheckbox,
  getToolGroup,
  getToolGroupSwitch,
  getToolsButton,
  openToolsPopover,
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
  test("shows an empty built-in group when no tools are available", async ({
    sidepanelPage,
  }) => {
    setupFooterMocks(sidepanelPage)

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)

    const group = getToolGroup(page, "Built-in")

    await expect(group).toContainText("0 of 0 tools")
    await expect(
      group.getByRole("button", { name: "Expand Built-in tools" }),
    ).toBeDisabled()
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
    await expandToolGroup(page, "Built-in")

    await expect(getToolCheckbox(page, "tool-a")).toBeChecked()
    await expect(page.getByText("tool-hidden")).toHaveCount(0)

    await getToolCheckbox(page, "tool-a").click()

    await expect
      .poll(() => recorders.chatSettingsUpdateCalls.at(-1)?.[1].tools)
      .toEqual([
        { enabled: false, name: "tool-a" },
        { enabled: true, name: "tool-hidden" },
      ])
  })

  test("marks tools that ask for approval in this workspace", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.workspaces = [
      createWorkspace({
        toolPermissions: {
          builtin: { level: "allow", tools: { run_js: "ask" } },
        },
      }),
    ]
    state.tools = [
      createTool({ id: "fetch", name: "fetch" }),
      createTool({ id: "run_js", name: "run_js" }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)
    await expandToolGroup(page, "Built-in")

    const tools = getToolGroup(page, "Built-in").locator("label")

    await expect(tools.filter({ hasText: "run_js" })).toContainText(
      "Asks first",
    )
    await expect(tools.filter({ hasText: "fetch" })).not.toContainText(
      "Asks first",
    )
  })

  test("hides tools and servers disabled in the workspace", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.workspaces = [
      createWorkspace({
        toolPermissions: {
          builtin: { level: "allow", tools: { run_js: "disabled" } },
          mcp: { GitHub: { level: "disabled" } },
        },
      }),
    ]
    state.tools = [
      createTool({ id: "fetch", name: "fetch" }),
      createTool({ id: "run_js", name: "run_js" }),
    ]
    state.mcpServers = [
      createMcpServer(),
      createMcpServer({ name: "GitHub", url: "https://example.com/gh" }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)
    await expandToolGroup(page, "Built-in")

    await expect(getToolGroup(page, "Built-in")).toContainText("1 of 1 tools")
    await expect(getToolCheckbox(page, "fetch")).toBeVisible()
    await expect(getToolCheckbox(page, "run_js")).toHaveCount(0)
    await expect(getToolGroupSwitch(page, "Docs")).toBeVisible()
    await expect(getToolGroupSwitch(page, "GitHub")).toHaveCount(0)
  })

  test("turns a whole group off and on", async ({ sidepanelPage }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.tools = [
      createTool({ id: "tool-a", name: "tool-a" }),
      createTool({ id: "tool-b", name: "tool-b" }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)

    const group = getToolGroup(page, "Built-in")

    await expect(group).toContainText("2 of 2 tools")
    await getToolGroupSwitch(page, "Built-in").uncheck()
    await expect(group).toContainText("0 of 2 tools")
    await getToolGroupSwitch(page, "Built-in").check()
    await expect(group).toContainText("2 of 2 tools")
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
    await expandToolGroup(page, "Built-in")
    await getToolCheckbox(page, "tool-b").click()

    expect(recorders.chatSettingsUpdateCalls).toEqual([])

    await page.keyboard.press("Escape")
    await getMessageEditor(page).fill("Send with local tools")
    await getSendMessageButton(page).click()

    await expect.poll(() => recorders.sendCalls.length).toBe(1)
    expect(recorders.sendCalls[0]?.[4]?.tools).toEqual([
      { enabled: true, name: "tool-a" },
      { enabled: true, name: "tool-b" },
    ])
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

    const group = getToolGroup(page, "Docs")

    await expect(group).toContainText("Loading tools…")

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

    await expect(group).toContainText("0 of 2 tools")
    await getToolGroupSwitch(page, "Docs").check()
    await expandToolGroup(page, "Docs")

    await expect(getToolCheckbox(page, "docs-search")).toBeChecked()
    await expect(getToolCheckbox(page, "docs-open")).toBeChecked()

    await getToolGroupSwitch(page, "Docs").uncheck()
    await expect(getToolCheckbox(page, "docs-search")).not.toBeChecked()
    await expect(getToolCheckbox(page, "docs-open")).not.toBeChecked()
  })

  test("shows MCP loading errors with a reconnect action", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.mcpServers = [createMcpServer()]

    let calls = 0

    sidepanelPage.mocks.mcpServerToolsGet = async () => {
      calls += 1
      throw new Error("Failed to load MCP server tools.")
    }

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)

    const group = getToolGroup(page, "Docs")

    await expect(group).toContainText("Failed to load MCP server tools.")
    await expect(getToolGroupSwitch(page, "Docs")).toBeDisabled()

    const callsBefore = calls

    await group.getByRole("button", { name: "Reconnect" }).click()
    await expect.poll(() => calls).toBeGreaterThan(callsBefore)
  })

  test("only lists the MCP servers of the workspace", async ({
    sidepanelPage,
  }) => {
    const { state } = setupFooterMocks(sidepanelPage)
    state.workspaces = [createWorkspace({ mcpServers: ["Docs"] })]
    state.mcpServers = [
      createMcpServer(),
      createMcpServer({ name: "GitHub", url: "https://example.com/gh" }),
    ]

    const page = sidepanelPage.page

    await openBottomBar(sidepanelPage)
    await openToolsPopover(page)

    await expect(getToolGroupSwitch(page, "Docs")).toBeVisible()
    await expect(getToolGroupSwitch(page, "GitHub")).toHaveCount(0)
  })

  test("rehydrates tool state from the opened chat settings", async ({
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
    await expandToolGroup(page, "Built-in")
    await expect(getToolCheckbox(page, "tool-a")).not.toBeChecked()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Chat history" }).click()
    await page
      .getByTestId("session-row")
      .filter({ hasText: "Chat 2" })
      .getByRole("button")
      .first()
      .click()
    await expect(getToolsButton(page)).toBeVisible()

    await openToolsPopover(page)
    await expandToolGroup(page, "Built-in")
    await expect(getToolCheckbox(page, "tool-a")).toBeChecked()
  })
})
