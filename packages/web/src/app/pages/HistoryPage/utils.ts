import type { Chat } from "@pilot43/protocol"

const day = 24 * 60 * 60 * 1000

export interface ChatGroup {
  chats: Chat[]
  label: string
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" })
const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})

/**
 * Groups chats for the history list: pinned first, then by how recently they
 * were updated (Today, Yesterday, Previous 7 days, Previous 30 days, then by
 * month). Chats inside a group are newest first.
 */
export function groupChats(chats: Chat[], now = new Date()): ChatGroup[] {
  const today = startOfDay(now)
  const groups = new Map<string, Chat[]>()
  const sorted = chats.toSorted(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  )

  for (const chat of sorted) {
    const label = chat.settings.pinned
      ? "Pinned"
      : getDateGroupLabel(chat.updatedAt ?? 0, today, now)

    groups.set(label, [...(groups.get(label) ?? []), chat])
  }

  const pinned = groups.get("Pinned")
  groups.delete("Pinned")

  return [
    ...(pinned ? [{ chats: pinned, label: "Pinned" }] : []),
    ...[...groups].map(([label, items]) => ({ chats: items, label })),
  ]
}

function getDateGroupLabel(timestamp: number, today: number, now: Date) {
  if (timestamp >= today) {
    return "Today"
  }

  if (timestamp >= today - day) {
    return "Yesterday"
  }

  if (timestamp >= today - 7 * day) {
    return "Previous 7 days"
  }

  if (timestamp >= today - 30 * day) {
    return "Previous 30 days"
  }

  const date = new Date(timestamp)

  return date.getFullYear() === now.getFullYear()
    ? monthFormatter.format(date)
    : monthYearFormatter.format(date)
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" })
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
})

/** Compact time shown at the end of a history row. */
export function formatChatTime(timestamp: number, now = new Date()) {
  const diff = now.getTime() - timestamp

  if (diff < 60_000) {
    return "now"
  }

  if (timestamp >= startOfDay(now) - day) {
    return timeFormatter.format(timestamp)
  }

  if (diff < 7 * day) {
    return weekdayFormatter.format(timestamp)
  }

  return dateFormatter.format(timestamp)
}
