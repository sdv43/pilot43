export interface TodoItem {
  id: string
  label: string
  status: "completed" | "in_progress" | "pending"
}

/**
 * Parses a single-level markdown checklist into structured todo items.
 *
 * Supported status markers:
 * - `[ ]` → pending
 * - `[x]` / `[X]` → completed
 * - `[-]` → in progress
 *
 * Lines that do not match the checklist syntax are ignored so the UI only
 * renders actionable items.
 */
export function parseTodoList(todos: string): TodoItem[] {
  // we need to replace text \n into real new lines, because the text is coming from a textarea and the new lines are escaped
  const normalizedTodos = todos.replace(/\\n/g, "\n")
  const lines = normalizedTodos.split(/\r?\n/)
  const items: TodoItem[] = []

  for (const line of lines) {
    const match = line.match(/^\s*[-*+]?\s*\[([ xX-])\]\s+(.*)$/)
    if (!match) {
      continue
    }

    const marker = match[1]
    const label = match[2].trim()
    if (!label) {
      continue
    }

    const status: TodoItem["status"] =
      marker === "x" || marker === "X"
        ? "completed"
        : marker === "-"
          ? "in_progress"
          : "pending"

    items.push({ id: `${items.length}-${label}`, label, status })
  }

  return items
}

export interface TodoListStats {
  completedCount: number
  inProgress: null | TodoItem
  totalCount: number
}

export function getTodoListStats(items: TodoItem[]): TodoListStats {
  let completedCount = 0
  let inProgress: null | TodoItem = null

  for (const item of items) {
    if (item.status === "completed") {
      completedCount += 1
    } else if (item.status === "in_progress" && !inProgress) {
      inProgress = item
    }
  }

  return {
    completedCount,
    inProgress,
    totalCount: items.length,
  }
}
