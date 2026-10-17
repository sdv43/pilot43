import type { McpServer, Workspace } from "@pilot43/protocol"

import { useState } from "react"

import type { WorkspaceDraft } from "../types"

import { createWorkspaceDraft } from "../utils"

/** Form state of the workspace being created or edited. */
export function useWorkspaceDraft(
  workspace: undefined | Workspace,
  servers: McpServer[],
) {
  const [draft, setDraft] = useState(() =>
    createWorkspaceDraft(workspace, servers),
  )

  function update(patch: Partial<WorkspaceDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  return { draft, update }
}
