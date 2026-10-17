import type { Workspace } from "@pilot43/protocol"

import type { AgentStorage } from "./types"

export function createWorkspaceStore(storage: AgentStorage) {
  return {
    getAllWorkspaces: (): Promise<Workspace[]> => {
      return storage.workspaces.getAll()
    },

    getWorkspaceById: (id: Workspace["id"]): Promise<undefined | Workspace> => {
      return storage.workspaces.getById(id)
    },

    createWorkspace: async (
      workspace: Partial<Omit<Workspace, "id" | "lastSelectedChatId">> &
        Pick<Workspace, "name">,
    ): Promise<Workspace> => {
      const newWorkspace: Workspace = {
        color: "violet",
        ...workspace,
        id: crypto.randomUUID(),
        lastSelectedChatId: null,
      }
      await storage.workspaces.put(newWorkspace)
      return newWorkspace
    },

    updateWorkspace: async (workspace: Workspace): Promise<Workspace> => {
      await storage.workspaces.put(workspace)
      return workspace
    },

    deleteWorkspace: async (id: Workspace["id"]): Promise<void> => {
      await storage.workspaces.delete(id)
    },
  }
}
