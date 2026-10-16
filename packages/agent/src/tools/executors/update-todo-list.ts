import type { Chat } from "@pilot43/protocol"

import type { AgentStore } from "../../storage"
import type { Tool } from "../types"

import { requireStringValue } from "./shared"

/**
 * Parses and validates the arguments for `update_todo_list`, returning the
 * markdown checklist string. An empty string is valid and clears the list.
 */
export function parseUpdateTodoListArgs(args: Record<string, unknown>): {
  todos: string
} {
  const todos = requireStringValue(args, "todos")
  return { todos }
}

/**
 * Persists the assistant's todo checklist onto the chat so it survives across
 * turns and is shown to the user as progress. An empty string clears the list.
 * Unlike `ask_followup_question`, this tool does not pause generation.
 */
export async function executeUpdateTodoListTool(
  args: Record<string, unknown>,
  chatId: Chat["id"],
  store: AgentStore,
): Promise<Record<string, unknown>> {
  const { todos } = parseUpdateTodoListArgs(args)
  await store.updateChatTodoList(chatId, todos)
  return { ok: true, todoList: todos }
}

export const updateTodoListTool: Tool = {
  definition: {
    id: "update_todo_list",
    name: "update_todo_list",
    shortDescription: "Track task progress with a checklist.",
    description:
      'Replace the entire TODO list with an updated checklist reflecting the current state. Always send the full list; the system overwrites the previous one. The checklist persists across turns and is shown to the user as progress, so keep it up to date as you work.\n\nFormat: a single-level markdown checklist (no nesting or subtasks), listed in intended execution order. Status markers: `[ ]` pending, `[x]` completed, `[-]` in progress.\n\nPrinciples: before updating, confirm which todos are actually done; update multiple statuses in one call; add new actionable items as discovered; only mark a todo completed when fully accomplished; keep unfinished tasks unless instructed to remove them; send an empty string to clear the list when the task is fully done.\n\nExample:\n{ "todos": "[x] Analyze requirements\\n[-] Implement logic\\n[ ] Write tests" }',
    hidden: true,
  },
  inputSchema: {
    additionalProperties: false,
    properties: {
      todos: {
        description:
          "Full markdown checklist in execution order, using [ ] for pending, [x] for completed, and [-] for in progress. Send an empty string to clear the list.",
        type: "string",
      },
    },
    required: ["todos"],
    type: "object",
  },
  execute: (args, { chatId, store }) =>
    executeUpdateTodoListTool(args, chatId, store),
}
