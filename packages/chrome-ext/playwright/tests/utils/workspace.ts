import { type Page } from "@playwright/test"
import { expect } from "../../fixtures"

export function getWorkspaceSelector(p: Page) {
  return p.getByTestId("workspace-switcher")
}

export function getWorkspaceMenu(p: Page) {
  return p.getByRole("menu", { name: "Workspaces" })
}

export async function openWorkspaceSelector(p: Page) {
  const s = getWorkspaceSelector(p)

  if ((await s.getAttribute("aria-expanded")) !== "true") {
    await s.click()
  }

  await expect(getWorkspaceMenu(p)).toBeVisible()
}

export async function closeWorkspaceSelector(p: Page) {
  if (await getWorkspaceMenu(p).isVisible()) {
    await p.keyboard.press("Escape")
  }

  await expect(getWorkspaceMenu(p)).not.toBeVisible()
}

export async function selectWorkspace(p: Page, name: string) {
  const selector = getWorkspaceSelector(p)

  await expect(selector).toBeVisible()

  if ((await selector.textContent())?.includes(name)) {
    return
  }

  await openWorkspaceSelector(p)
  await getWorkspaceMenu(p)
    .getByRole("menuitemradio")
    .filter({ hasText: name })
    .click()
  await expect(getWorkspaceMenu(p)).not.toBeVisible()
  await expect(selector).toContainText(name)
}
