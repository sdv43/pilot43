import { Input } from "@/sidepanel/app/components/Input"

import type { OllamaProviderFormProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"
import { ProviderNameAndTypeFields } from "../ProviderNameAndTypeFields"
import { getProviderFromOllamaType } from "./utils"

export function OllamaProviderForm({
  provider,
  onProviderChange,
}: OllamaProviderFormProps) {
  return (
    <div>
      <ProviderNameAndTypeFields
        name={provider.name}
        namePlaceholder="e.g., My Ollama"
        type={provider.type}
        onNameChange={(name) => onProviderChange({ ...provider, name })}
        onTypeChange={(type) =>
          onProviderChange(getProviderFromOllamaType(provider, type))
        }
      />

      <div className={sSettings.field}>
        <label className={sSettings.label} htmlFor="host">
          Host
        </label>
        <Input
          required
          id="host"
          name="host"
          placeholder="http://localhost:11434"
          type="url"
          value={provider.settings.host || ""}
          onChange={(e) =>
            onProviderChange({
              ...provider,
              settings: { ...provider.settings, host: e.target.value },
            })
          }
        />
        <p className={sSettings.helpText}>Your Ollama server URL</p>
      </div>
    </div>
  )
}
