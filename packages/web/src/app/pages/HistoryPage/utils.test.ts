import type { Chat } from "@pilot43/protocol"

import { describe, expect, it } from "vitest"

import { formatChatTime, groupChats } from "./utils"

const now = new Date(2026, 9, 17, 12, 0)
const hour = 60 * 60 * 1000

function chat(id: string, updatedAt: number, pinned = false): Chat {
  return {
    id,
    settings: { pinned, tools: [] },
    title: id,
    updatedAt,
    workspaceId: "w1",
  }
}

describe("groupChats", () => {
  it("puts pinned chats first and groups the rest by date", () => {
    const groups = groupChats(
      [
        chat("today", now.getTime() - hour),
        chat("pinned-old", now.getTime() - 40 * 24 * hour, true),
        chat("yesterday", now.getTime() - 20 * hour),
        chat("week", now.getTime() - 4 * 24 * hour),
        chat("month", now.getTime() - 20 * 24 * hour),
        chat("july", new Date(2026, 6, 3).getTime()),
        chat("last-year", new Date(2025, 6, 3).getTime()),
      ],
      now,
    )

    expect(
      groups.map((group) => [group.label, group.chats.map((c) => c.id)]),
    ).toEqual([
      ["Pinned", ["pinned-old"]],
      ["Today", ["today"]],
      ["Yesterday", ["yesterday"]],
      ["Previous 7 days", ["week"]],
      ["Previous 30 days", ["month"]],
      ["July", ["july"]],
      ["July 2025", ["last-year"]],
    ])
  })
})

describe("formatChatTime", () => {
  it("formats recent times compactly", () => {
    expect(formatChatTime(now.getTime() - 10_000, now)).toBe("now")
    expect(formatChatTime(new Date(2026, 9, 17, 9, 5).getTime(), now)).toBe(
      "09:05",
    )
    expect(formatChatTime(new Date(2026, 9, 16, 16, 45).getTime(), now)).toBe(
      "16:45",
    )
    expect(formatChatTime(new Date(2026, 9, 13, 10).getTime(), now)).toBe("Tue")
    expect(formatChatTime(new Date(2026, 9, 1).getTime(), now)).toBe("Oct 1")
  })
})
