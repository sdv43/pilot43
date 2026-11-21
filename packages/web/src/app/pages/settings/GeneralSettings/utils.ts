import type {
  Chat,
  ChatRetentionDays,
  HistorySummaryThreshold,
} from "@pilot43/protocol"

import {
  chatRetentionOptions,
  defaultHistorySummaryThreshold,
  historySummaryThresholdOptions,
} from "@pilot43/protocol"

import type { Theme } from "../../../../shared/theme"

import { retentionLabels, themeSelectOptions } from "./const"

export function retentionToValue(days: ChatRetentionDays | undefined) {
  return days ? String(days) : "never"
}

export function valueToRetention(value: string): ChatRetentionDays {
  const days = Number(value)

  return chatRetentionOptions.find((option) => option === days) ?? null
}

const day = 24 * 60 * 60 * 1000

/** Unpinned chats a retention period would delete right away. */
export function countChatsToDelete(
  chats: Pick<Chat, "createdAt" | "settings" | "updatedAt">[],
  days: ChatRetentionDays,
  now = Date.now(),
) {
  if (!days) {
    return 0
  }

  const cutoff = now - days * day

  return chats.filter(
    (chat) =>
      !chat.settings.pinned &&
      (chat.updatedAt ?? chat.createdAt ?? now) < cutoff,
  ).length
}

/**
 * Chat history options. Shorter periods say how many chats they would delete
 * as soon as they are picked.
 */
export function getRetentionSelectOptions(
  chats: Pick<Chat, "createdAt" | "settings" | "updatedAt">[] = [],
  now = Date.now(),
) {
  return chatRetentionOptions.map((days) => {
    const value = retentionToValue(days)
    const label = retentionLabels[value as keyof typeof retentionLabels]
    const count = countChatsToDelete(chats, days, now)

    return {
      label:
        count > 0
          ? `${label} · deletes ${count} ${count === 1 ? "chat" : "chats"}`
          : label,
      value,
    }
  })
}

export const retentionSelectOptions = getRetentionSelectOptions()

export function valueToTheme(value: string): Theme {
  return (
    themeSelectOptions.find((option) => option.value === value)?.value ??
    "system"
  )
}

/** "Summarise history" options: shares of the model's context window. */
export const summaryThresholdSelectOptions = historySummaryThresholdOptions.map(
  (threshold) => ({
    label: `At ${threshold}%`,
    value: String(threshold),
  }),
)

export function valueToSummaryThreshold(
  value: string,
): HistorySummaryThreshold {
  const threshold = Number(value)

  return (
    historySummaryThresholdOptions.find((option) => option === threshold) ??
    defaultHistorySummaryThreshold
  )
}
