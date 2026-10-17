import type { Page } from "@playwright/test"

import { test } from "../fixtures"
import { seedMocks } from "./seed"

const outDir = "test-results/screens"

async function shot(page: Page, name: string) {
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${outDir}/${name}.png` })
}

test.beforeEach(async ({ sidepanelPage }) => {
  seedMocks(sidepanelPage.mocks)
  await sidepanelPage.mockLocalStorage({ lastSelectedWorkspaceId: "w1" })
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
