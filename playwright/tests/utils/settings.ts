import type { Page } from "@playwright/test"
import { expect } from "../../fixtures"

export async function openSettingsDialog(p: Page) {
  await p.getByRole("button", { name: "Settings" }).click()
  await expect(p.getByRole("dialog", { name: "Settings" })).toBeVisible()
}

export function getSettingsDialog(p: Page) {
  return p.getByRole("dialog", { name: "Settings" })
}
