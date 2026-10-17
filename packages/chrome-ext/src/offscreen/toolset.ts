import type { Toolset } from "@pilot43/agent"

import {
  askFollowupQuestionTool,
  fetchTool,
  generateFileTool,
  updateTodoListTool,
} from "@pilot43/agent"
import { mcpToolProvider } from "@pilot43/agent"
import { readWebpageTool } from "@pilot43/agent-browser"
import { createRunJsTool } from "@pilot43/agent-browser"

/**
 * Tools available to the agent in the Chrome extension. Built-in tools are
 * advertised to the model and listed in the tools settings UI in this order.
 */
export const toolset: Toolset = {
  tools: [
    fetchTool,
    readWebpageTool,
    createRunJsTool({
      sandboxPageUrl: chrome.runtime.getURL("sandbox.html"),
    }),
    generateFileTool,
    askFollowupQuestionTool,
    updateTodoListTool,
  ],
  providers: [mcpToolProvider],
}
