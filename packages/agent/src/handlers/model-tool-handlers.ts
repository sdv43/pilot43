import type { ModelTool } from "@pilot43/protocol"

import type { AgentContext } from "../context"

export function handleModelToolGet(ctx: AgentContext): Promise<ModelTool[]> {
  return Promise.resolve(
    ctx.toolset.tools
      .filter((tool) => !tool.definition.hidden)
      .map((tool) => tool.definition),
  )
}
