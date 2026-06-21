import type { Chat } from "@/shared/api"

import { updateChatTodoList } from "../../storage"
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
): Promise<Record<string, unknown>> {
  const { todos } = parseUpdateTodoListArgs(args)
  await updateChatTodoList(chatId, todos)
  return { ok: true, todoList: todos }
}
