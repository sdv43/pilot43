import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ModelSelectorStore {
  collapsedGroupIds: string[]
  searchQuery: string
}

export const useModelSelectorStore = create<ModelSelectorStore>()(
  persist<ModelSelectorStore>(
    () => ({
      collapsedGroupIds: [],
      searchQuery: "",
    }),
    {
      name: "pilot43:model-selector",
    },
  ),
)

export const modelSelectorActions = {
  setCollapsedGroupIds: (collapsedGroupIds: string[]) => {
    useModelSelectorStore.setState({ collapsedGroupIds })
  },
  setSearchQuery: (searchQuery: string) => {
    useModelSelectorStore.setState({ searchQuery })
  },
}
