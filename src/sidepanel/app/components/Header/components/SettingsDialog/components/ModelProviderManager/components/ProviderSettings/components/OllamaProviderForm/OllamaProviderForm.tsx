import { Input } from "@/sidepanel/app/components/Input"
import { Selector } from "@/sidepanel/app/components/Selector"
import { useModelProviderTypeGet } from "@/sidepanel/queries/modelProvider"

import type { OllamaProviderFormProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"
import s from "./OllamaProviderForm.module.css"

export function OllamaProviderForm({
  provider,
  onProviderChange,
}: OllamaProviderFormProps) {
  const { data: providerTypes = [] } = useModelProviderTypeGet()

  const typeOptions = providerTypes.map((t) => ({
    value: t.type,
    label: t.name,
  }))

  return (
    <div className={s.ollamaProviderForm}>
      <div className={s.field}>
        <Input
          required
          id="name"
          name="name"
          placeholder="Provider name"
          value={provider.name}
          onChange={(e) =>
            onProviderChange({ ...provider, name: e.target.value })
          }
        />
      </div>

      <div className={s.field}>
        <Selector
          id="type"
          name="type"
          options={typeOptions}
          placeholder="Select provider type"
          popoverClassName={sSettings.selectorPopover}
          value={provider.type}
          variant="input"
          onValueChange={(value) => {
            if (value === "ollama") {
              onProviderChange({
                ...provider,
                type: "ollama",
                settings: { host: provider.settings.host },
              })
            } else if (value === "openai") {
              onProviderChange({
                ...provider,
                type: "openai",
                settings: { apiKey: "" },
              })
            }
          }}
        />
      </div>

      <div className={s.field}>
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
        <p className={s.helpText}>Your Ollama server URL</p>
      </div>
    </div>
  )
}
