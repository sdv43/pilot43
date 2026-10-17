import type { ChatRetentionDays } from "@pilot43/protocol"

import type { Theme } from "../../../../shared/theme"

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

export const themeSelectOptions: readonly { label: string; value: Theme }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
]
