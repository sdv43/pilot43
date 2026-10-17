import type { ChatRetentionDays } from "@pilot43/protocol"

import { chatRetentionOptions } from "@pilot43/protocol"

import { retentionLabels } from "./const"

export function retentionToValue(days: ChatRetentionDays | undefined) {
  return days ? String(days) : "never"
}

export function valueToRetention(value: string): ChatRetentionDays {
  const days = Number(value)

  return chatRetentionOptions.find((option) => option === days) ?? null
}

export const retentionSelectOptions = chatRetentionOptions.map((days) => {
  const value = retentionToValue(days)

  return {
    label: retentionLabels[value as keyof typeof retentionLabels],
    value,
  }
})
