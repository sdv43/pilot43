import { useMemo } from "react"

import type { Workspace } from "@/shared/api/entities"

export function useWorkspaceOptions(data: undefined | Workspace[]) {
  return useMemo(
    () =>
      (data ?? []).map((workspace) => ({
        label: workspace.name,
        value: workspace.id,
      })),
    [data],
  )
}
