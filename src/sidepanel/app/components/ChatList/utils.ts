import type { Chat } from "@/shared/api"

export function twoLetters(name: string) {
  const words = name.split(" ")
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  } else {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
}

export function sortChats(chats: Chat[]) {
  return chats.toSorted((a, b) => {
    const pinnedDiff = Number(!!b.settings.pinned) - Number(!!a.settings.pinned)

    if (pinnedDiff !== 0) {
      return pinnedDiff
    }

    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const chatDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function formatChatDateLabel(timestamp: number, now: Date = new Date()) {
  const date = new Date(timestamp)
  const dateStart = startOfDay(date)
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  if (dateStart.getTime() === todayStart.getTime()) {
    return "Today"
  }

  if (dateStart.getTime() === yesterdayStart.getTime()) {
    return "Yesterday"
  }

  return chatDateFormatter.format(date)
}
