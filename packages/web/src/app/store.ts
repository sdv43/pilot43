import type {
  ModelProvider,
  ModelProviderModel,
  Workspace,
} from "@pilot43/protocol"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Theme } from "../shared/theme"

export interface Store {
  /** Providers whose models are folded away in the model selector. */
  collapsedModelProviderIds: ModelProvider["id"][]
  /**
   * Starred models, shown in the Favourites group at the top of the model
   * selector. Global like the collapsed groups, not per workspace.
   */
  favoriteModelIds: ModelProviderModel["id"][]
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
      collapsedModelProviderIds: [],
      favoriteModelIds: [],
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
  toggleModelFavorite: (id: ModelProviderModel["id"]) => {
    useStore.setState(({ favoriteModelIds: ids }) => ({
      favoriteModelIds: ids.includes(id)
        ? ids.filter((favoriteId) => favoriteId !== id)
        : [...ids, id],
    }))
  },
  toggleModelProviderCollapsed: (id: ModelProvider["id"]) => {
    useStore.setState(({ collapsedModelProviderIds: ids }) => ({
      collapsedModelProviderIds: ids.includes(id)
        ? ids.filter((collapsedId) => collapsedId !== id)
        : [...ids, id],
    }))
  },
}
