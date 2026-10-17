import type { Workspace } from "@pilot43/protocol"

/** Editable fields of a workspace. */
export type WorkspaceDraft = Required<
  Pick<
    Workspace,
    "color" | "mcpServers" | "name" | "systemPrompt" | "toolPermissions"
  >
>
