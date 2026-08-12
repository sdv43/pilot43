import type { ModelTool } from "@/shared/api"

import { builtinToolDefinitions } from "../tools/const"

export function handleModelToolGet(): Promise<ModelTool[]> {
  return Promise.resolve(
    builtinToolDefinitions
      .filter((tool) => !tool.definition.hidden)
      .map((tool) => tool.definition),
  )
}
