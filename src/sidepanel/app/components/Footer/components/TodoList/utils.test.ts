import { describe, expect, it } from "vitest"

import { getTodoListStats, parseTodoList } from "./utils"

describe("parseTodoList", () => {
  it("parses pending, completed and in-progress items while ignoring invalid rows", () => {
    const items = parseTodoList(
      [
        "- [ ] first task",
        "- [x] done task",
        "- [X] another done task",
        "- [-] active task",
        "plain text",
        "- [ ]   ",
      ].join("\n"),
    )

    expect(items).toEqual([
      { id: "0-first task", label: "first task", status: "pending" },
      { id: "1-done task", label: "done task", status: "completed" },
      {
        id: "2-another done task",
        label: "another done task",
        status: "completed",
      },
      { id: "3-active task", label: "active task", status: "in_progress" },
    ])
  })

  it("supports escaped newlines from textarea values", () => {
    expect(parseTodoList("- [ ] first\\n- [x] second")).toEqual([
      { id: "0-first", label: "first", status: "pending" },
      { id: "1-second", label: "second", status: "completed" },
    ])
  })
})

describe("getTodoListStats", () => {
  it("returns the completed count, total count and first in-progress item", () => {
    const stats = getTodoListStats([
      { id: "1", label: "done", status: "completed" },
      { id: "2", label: "active", status: "in_progress" },
      { id: "3", label: "pending", status: "pending" },
      { id: "4", label: "active second", status: "in_progress" },
    ])

    expect(stats).toEqual({
      completedCount: 1,
      inProgress: { id: "2", label: "active", status: "in_progress" },
      totalCount: 4,
    })
  })
})
