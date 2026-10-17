import type { Page } from "@playwright/test"

export function getLatestToast(p: Page) {
  return p.getByRole("alert").first()
}
