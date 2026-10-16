import type { Workspace } from "@pilot43/protocol"

import { useMemo } from "react"

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
