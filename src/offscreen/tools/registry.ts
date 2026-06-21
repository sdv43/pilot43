import type { ModelTool } from "@/shared/api"

import { registeredToolDefinitions } from "./const"

/**
 * Returns the tool definitions shown in the per-chat tools settings UI.
 * Hidden tools (system/interactive tools the user cannot disable) are excluded.
 */
export function getModelTools(): ModelTool[] {
  return registeredToolDefinitions
    .filter((tool) => !tool.definition.hidden)
    .map((tool) => tool.definition)
}
