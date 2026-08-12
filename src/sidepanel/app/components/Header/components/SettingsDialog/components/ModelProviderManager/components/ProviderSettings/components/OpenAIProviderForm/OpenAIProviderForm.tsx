import { Input } from "@/sidepanel/app/components/Input"

import type { OpenAIProviderFormProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"
import { ProviderApiKeyField } from "../ProviderApiKeyField"
import { ProviderNameAndTypeFields } from "../ProviderNameAndTypeFields"
import { getProviderFromOpenAIType } from "./utils"

export function OpenAIProviderForm({
  provider,
  onProviderChange,
}: OpenAIProviderFormProps) {
  return (
    <div>
      <ProviderNameAndTypeFields
        name={provider.name}
        namePlaceholder="e.g., My OpenAI"
        type={provider.type}
        onNameChange={(name) => onProviderChange({ ...provider, name })}
        onTypeChange={(type) =>
          onProviderChange(getProviderFromOpenAIType(provider, type))
        }
      />

      <ProviderApiKeyField
        placeholder="sk-..."
        value={provider.settings.apiKey}
        onChange={(apiKey) =>
          onProviderChange({
            ...provider,
            settings: { ...provider.settings, apiKey },
          })
        }
      />

      <div className={sSettings.field}>
        <label className={sSettings.label} htmlFor="host">
          Host (Optional)
        </label>
        <Input
          id="host"
          name="host"
          placeholder="https://api.openai.com"
          type="url"
          value={provider.settings.host || ""}
          onChange={(e) =>
            onProviderChange({
              ...provider,
              settings: { ...provider.settings, host: e.target.value },
            })
          }
        />
        <p className={sSettings.helpText}>
          Custom OpenAI-compatible API endpoint
        </p>
      </div>
    </div>
  )
}
