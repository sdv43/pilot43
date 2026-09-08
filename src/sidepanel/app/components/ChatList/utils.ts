import type { Chat } from "@/shared/api"

export function twoLetters(name: string) {
  const firstWord = name.trim().split(/\s+/)[0]

  if (!firstWord) {
    return ""
  }

  const firstLetter = firstWord[0].toUpperCase()
  const secondLetter = firstWord.slice(1, 2).toLowerCase()

  return `${firstLetter}${secondLetter}`
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
