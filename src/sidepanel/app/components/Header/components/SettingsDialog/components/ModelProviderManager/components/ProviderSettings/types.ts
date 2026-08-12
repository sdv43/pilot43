import type { ModelProvider } from "@/sidepanel/queries/modelProvider"

export interface ProviderSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: ModelProvider | null
}
