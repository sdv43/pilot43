import type { ModelTool } from "@pilot43/protocol"

import { builtinToolDefinitions } from "../tools/const"

export function handleModelToolGet(): Promise<ModelTool[]> {
  return Promise.resolve(
    builtinToolDefinitions
      .filter((tool) => !tool.definition.hidden)
      .map((tool) => tool.definition),
  )
}
