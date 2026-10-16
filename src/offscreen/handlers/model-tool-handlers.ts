import type { ModelTool } from "@pilot43/protocol"

import { toolset } from "../toolset"

export function handleModelToolGet(): Promise<ModelTool[]> {
  return Promise.resolve(
    toolset.tools
      .filter((tool) => !tool.definition.hidden)
      .map((tool) => tool.definition),
  )
}
