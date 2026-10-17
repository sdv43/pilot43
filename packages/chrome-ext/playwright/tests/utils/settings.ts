import type { Page } from "@playwright/test"
import { expect } from "../../fixtures"

export const settingsTabs = {
  General: "general",
  Workspaces: "workspaces",
  Providers: "providers",
  MCP: "mcp",
  Prompts: "prompts",
} as const

export type SettingsTab = keyof typeof settingsTabs

/** Opens Settings from the chat header and switches to `tab`. */
export async function openSettings(p: Page, tab: SettingsTab = "General") {
  await p.getByRole("button", { name: "Settings" }).click()
  await expect(p.getByRole("heading", { name: "Settings" })).toBeVisible()
  await openSettingsTab(p, tab)
}

export async function openSettingsTab(p: Page, tab: SettingsTab) {
  const link = p.getByTestId(`settings-tab-${settingsTabs[tab]}`)

  await link.click()
  await expect(link).toHaveAttribute("aria-current", "page")
}

export function getConfirmDialog(p: Page) {
  return p.getByRole("dialog")
}

/** Types the confirmation text, if asked for, and confirms the dialog. */
export async function confirmDialog(p: Page, confirmText?: string) {
  const dialog = getConfirmDialog(p)

  await expect(dialog).toBeVisible()

  if (confirmText !== undefined) {
    await dialog.getByTestId("confirm-dialog-input").fill(confirmText)
  }

  await dialog.getByTestId("confirm-dialog-confirm").click()
}
