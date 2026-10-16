import type { Toolset } from "./tools/types"

import {
  askFollowupQuestionTool,
  fetchTool,
  generateFileTool,
  readWebpageTool,
  runJsTool,
  updateTodoListTool,
} from "./tools/executors"
import { mcpToolProvider } from "./tools/mcp-tools"

/**
 * Tools available to the agent in the Chrome extension. Built-in tools are
 * advertised to the model and listed in the tools settings UI in this order.
 */
export const toolset: Toolset = {
  tools: [
    fetchTool,
    readWebpageTool,
    runJsTool,
    generateFileTool,
    askFollowupQuestionTool,
    updateTodoListTool,
  ],
  providers: [mcpToolProvider],
}
