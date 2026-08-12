import type { OpenRouterProviderFormProps } from "./types"

import { ProviderApiKeyField } from "../ProviderApiKeyField"
import { ProviderNameAndTypeFields } from "../ProviderNameAndTypeFields"
import { getProviderFromOpenRouterType } from "./utils"

export function OpenRouterProviderForm({
  provider,
  onProviderChange,
}: OpenRouterProviderFormProps) {
  return (
    <div>
      <ProviderNameAndTypeFields
        name={provider.name}
        namePlaceholder="e.g., My OpenRouter"
        type={provider.type}
        onNameChange={(name) => onProviderChange({ ...provider, name })}
        onTypeChange={(type) =>
          onProviderChange(getProviderFromOpenRouterType(provider, type))
        }
      />

      <ProviderApiKeyField
        placeholder="sk-or-..."
        value={provider.settings.apiKey}
        onChange={(apiKey) =>
          onProviderChange({
            ...provider,
            settings: { ...provider.settings, apiKey },
          })
        }
      />
    </div>
  )
}
