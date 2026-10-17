import type { Workspace } from "@pilot43/protocol"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Theme } from "../shared/theme"

export interface Store {
  lastSelectedWorkspaceId: null | Workspace["id"]
  /**
   * Colour theme picked in Settings → General. Kept in localStorage rather
   * than app settings so it is known synchronously before the first render.
   */
  theme: Theme
}

export const useStore = create<Store>()(
  persist(
    (_set) => ({
      lastSelectedWorkspaceId: null,
      theme: "system",
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
  setTheme: (theme: Theme) => {
    useStore.setState({ theme })
  },
}
