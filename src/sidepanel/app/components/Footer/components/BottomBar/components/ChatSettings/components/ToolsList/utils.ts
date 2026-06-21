import type { ToolItem } from "./types"

export function isToolEnabled(
  tool: Pick<ToolItem, "defaultEnabled" | "name"> | undefined,
  enabledTools: Record<string, boolean>,
): boolean {
  if (!tool) {
    return false
  }
  const override = enabledTools[tool.name]
  if (override !== undefined) {
    return override
  }
  return tool.defaultEnabled ?? true
}
