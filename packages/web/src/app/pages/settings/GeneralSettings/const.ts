import type { ChatRetentionDays } from "@pilot43/protocol"

export const retentionLabels: Record<
  "never" | `${NonNullable<ChatRetentionDays>}`,
  string
> = {
  "180": "180 days",
  "30": "30 days",
  "90": "90 days",
  never: "Never delete",
}

export const deleteAllConfirmText = "DELETE"
