import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Workspace } from "@/shared/api"

export interface Store {
  lastSelectedWorkspaceId: null | Workspace["id"]
}

export const useStore = create<Store>()(
  persist(
    (_set) => ({
      lastSelectedWorkspaceId: null,
    }),
    {
      name: "pilot43",
    },
  ),
)

export const actions = {
  setLastSelectedWorkspaceId: (id: null | Workspace["id"]) => {
    useStore.setState({ lastSelectedWorkspaceId: id })
  },
}
