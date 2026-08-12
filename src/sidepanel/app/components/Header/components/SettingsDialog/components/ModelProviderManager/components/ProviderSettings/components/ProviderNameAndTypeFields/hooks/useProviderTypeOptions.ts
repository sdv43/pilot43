import { useModelProviderTypeGet } from "@/sidepanel/queries/modelProvider"

import type { ProviderTypeOption } from "../types"

export function useProviderTypeOptions(): ProviderTypeOption[] {
  const { data: providerTypes = [] } = useModelProviderTypeGet()

  return providerTypes.map((providerType) => ({
    value: providerType.type,
    label: providerType.name,
  }))
}
