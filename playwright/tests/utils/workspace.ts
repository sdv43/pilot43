import { type Page } from "@playwright/test"

export function getWorkspaceSelector(p: Page) {
  return p.getByTestId("workspace-selector")
}

export async function openWorkspaceSelector(p: Page) {
  const s = getWorkspaceSelector(p)

  const isOpen = await s.getAttribute("aria-expanded")

  if (isOpen !== "true") {
    await s.click()
  }
}

export async function closeWorkspaceSelector(p: Page) {
  const s = getWorkspaceSelector(p)

  const isOpen = await s.getAttribute("aria-expanded")

  if (isOpen === "true") {
    await s.click()
  }
}

export async function selectWorkspace(p: Page, name: string) {
  await openWorkspaceSelector(p)
  await p.getByRole("listbox").getByRole("option", { name }).click()
  await closeWorkspaceSelector(p)
}
