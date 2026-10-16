import type { ProviderTypeOption } from "../types"

import { useModelProviderTypeGet } from "../../../../../../../../../../../../queries/modelProvider"

export function useProviderTypeOptions(): ProviderTypeOption[] {
  const { data: providerTypes = [] } = useModelProviderTypeGet()

  return providerTypes.map((providerType) => ({
    value: providerType.type,
    label: providerType.name,
  }))
}
