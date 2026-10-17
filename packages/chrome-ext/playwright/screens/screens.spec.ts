import type { Page } from "@playwright/test"

import { test } from "../fixtures"
import { seedMocks, workspaces } from "./seed"

/** `SCREENS_THEME=dark` renders the dark theme into `screens-dark`. */
const theme = process.env.SCREENS_THEME === "dark" ? "dark" : "light"
const outDir = `test-results/screens${theme === "dark" ? "-dark" : ""}`

async function shot(page: Page, name: string) {
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${outDir}/${name}.png` })
}

test.beforeEach(async ({ sidepanelPage }) => {
  seedMocks(sidepanelPage.mocks)
  await sidepanelPage.mockLocalStorage({ lastSelectedWorkspaceId: "w1", theme })
})

test("chat", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  await page.getByText("Find open GitHub issues").waitFor()
  await shot(page, "chat-conversation")

  await page.getByTestId("workspace-switcher").click()
  await page.getByRole("menu", { name: "Workspaces" }).waitFor()
  await shot(page, "chat-workspace-menu")
})

test("history", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  await page.getByRole("button", { name: "Chat history" }).click()
  await page.getByText("Pricing issues triage").waitFor()
  await shot(page, "history")
})

test("settings", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  for (const tab of ["general", "workspaces", "providers", "mcp", "prompts"]) {
    await page.goto(`${page.url().split("#")[0]}#/settings/${tab}`)
    await shot(page, `settings-${tab}`)
  }
})

test("settings pages", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  const pages: [string, string][] = [
    ["settings-workspace-edit", "#/settings/workspaces/w1"],
    ["settings-provider-new", "#/settings/providers/new"],
    ["settings-provider-edit", "#/settings/providers/p1"],
    ["settings-mcp-new", "#/settings/mcp/new"],
    ["settings-mcp-edit", "#/settings/mcp/github"],
    ["settings-prompt-edit", "#/settings/prompts/p1"],
  ]
  for (const [name, hash] of pages) {
    await page.goto(`${page.url().split("#")[0]}${hash}`)
    await shot(page, name)
  }
})

test("chat states", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  const base = () => page.url().split("#")[0]

  for (const chat of ["c3", "c4", "c5"]) {
    await page.goto(`${base()}#/w/w1/c/${chat}`)
    await page.getByTestId("message-run").first().waitFor()
    await shot(page, `chat-${chat}`)
  }

  await page.goto(`${base()}#/w/w1/c/c1`)
  await page.getByTestId("assistant-tool").first().click()
  await page.getByTestId("tool-call-details").waitFor()
  await shot(page, "chat-tool-details")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Select model" }).click()
  await shot(page, "chat-model-menu")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Tools" }).click()
  await shot(page, "chat-tools-menu")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Attach files" }).click()
  await shot(page, "chat-attach-menu")
  await page.keyboard.press("Escape")

  await page.goto(`${base()}#/w/w1`)
  await page.getByTestId("empty-chat").waitFor()
  await shot(page, "chat-new")
  await page.getByTestId("message-editor").fill("/")
  await shot(page, "chat-prompt-menu")
})

test("toasts", async ({ sidepanelPage }) => {
  const { mocks } = sidepanelPage
  mocks.dataDeleteAll = async () => workspaces[0]
  mocks.appSettingsUpdate = async () => {
    throw new Error("storage quota exceeded. Free up space and try again.")
  }
  await sidepanelPage.open()
  const { page } = sidepanelPage
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    })
  })
  const base = () => page.url().split("#")[0]

  await page.goto(`${base()}#/w/w1/c/c1`)
  await page.getByRole("button", { name: "Copy message" }).first().click()

  await page.goto(`${base()}#/settings/general`)
  await page.getByTestId("delete-all-data").click()
  await page.getByTestId("confirm-dialog-input").fill("DELETE")
  await page.getByTestId("confirm-dialog-confirm").click()

  await page.goto(`${base()}#/settings/general`)
  await page.getByTestId("chat-retention-select").selectOption("90")
  await page.getByRole("alert").nth(2).waitFor()
  // Let the entry animation finish.
  await page.waitForTimeout(250)
  await shot(page, "toasts")
})

test("fixes", async ({ sidepanelPage }) => {
  await sidepanelPage.open()
  const { page } = sidepanelPage
  const base = () => page.url().split("#")[0]

  // Selected text in the editor stays readable.
  await page.goto(`${base()}#/w/w1/c/c4`)
  const editor = page.getByTestId("message-editor")
  await editor.fill("Summarize the open pricing issues for the team")
  await editor.selectText()
  await shot(page, "fix-editor-selection")
  await editor.fill("")

  // Plan tracker spans the panel.
  await shot(page, "fix-todo-list")

  // Page preview wraps long lines.
  await page.getByRole("button", { name: "Attach files" }).click()
  await page.getByTestId("attach-menu-tab").first().click()
  await page.getByTestId("attach-menu-attach-tabs").click()
  await page
    .getByTestId("attachment-badge")
    .first()
    .getByRole("button")
    .first()
    .click()
  await page.getByTestId("attachment-preview").waitFor()
  await shot(page, "fix-attachment-preview")
  await page.keyboard.press("Escape")

  // Provider type picker in a narrow panel.
  await page.setViewportSize({ height: 720, width: 320 })
  await page.goto(`${base()}#/settings/providers/new`)
  await shot(page, "fix-provider-narrow")
  await page.setViewportSize({ height: 720, width: 400 })

  // Permission selector menu.
  await page.goto(`${base()}#/settings/workspaces/w1`)
  await page.getByRole("button", { name: "Expand Built-in tools" }).click()
  await page.getByTestId("permission-tool").nth(1).getByRole("button").click()
  await page.getByRole("menuitemradio").first().waitFor()
  await page.getByText("Tool permissions").scrollIntoViewIfNeeded()
  await shot(page, "fix-permission-menu")
})
