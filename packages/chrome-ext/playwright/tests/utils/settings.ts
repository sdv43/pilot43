import type { Page } from "@playwright/test"
import { expect } from "../../fixtures"

export const settingsSectionIds = {
  Common: "common",
  Providers: "providers",
  "MCP Servers": "mcp",
  Commands: "commands",
} as const

export type SettingsSection = keyof typeof settingsSectionIds

export async function openSettingsDialog(p: Page) {
  await p.getByRole("button", { name: "Settings" }).click()
  await expect(p.getByRole("dialog", { name: "Settings" })).toBeVisible()
}

export function getSettingsDialog(p: Page) {
  return p.getByRole("dialog", { name: "Settings" })
}

/**
 * Switches the settings dialog to the given sidebar section and waits for the
 * section's nav button to become active.
 */
export async function openSettingsSection(p: Page, label: SettingsSection) {
  const navButton = getSettingsDialog(p).getByTestId(
    `settings-section-${settingsSectionIds[label]}`,
  )

  await navButton.click()
  await expect(navButton).toHaveAttribute("aria-current", "page")
}
