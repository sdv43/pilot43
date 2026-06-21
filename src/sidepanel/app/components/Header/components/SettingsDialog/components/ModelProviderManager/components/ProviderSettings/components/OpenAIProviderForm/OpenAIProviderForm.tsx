import { Input } from "@/sidepanel/app/components/Input"
import { Selector } from "@/sidepanel/app/components/Selector"
import { useModelProviderTypeGet } from "@/sidepanel/queries/modelProvider"

import type { OpenAIProviderFormProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"
import s from "./OpenAIProviderForm.module.css"

export function OpenAIProviderForm({
  provider,
  onProviderChange,
}: OpenAIProviderFormProps) {
  const { data: providerTypes = [] } = useModelProviderTypeGet()

  const typeOptions = providerTypes.map((t) => ({
    value: t.type,
    label: t.name,
  }))

  return (
    <div className={s.openAIProviderForm}>
      <div className={s.field}>
        <label className={s.label} htmlFor="name">
          Name
        </label>
        <Input
          required
          id="name"
          name="name"
          placeholder="e.g., My OpenAI"
          value={provider.name}
          onChange={(e) =>
            onProviderChange({ ...provider, name: e.target.value })
          }
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="type">
          Type
        </label>
        <Selector
          id="type"
          name="type"
          options={typeOptions}
          placeholder="Select provider type"
          popoverClassName={sSettings.selectorPopover}
          value={provider.type}
          variant="input"
          onValueChange={(value) => {
            if (value === "openai") {
              onProviderChange({
                ...provider,
                type: "openai",
                settings: {
                  host: provider.settings.host,
                  apiKey: provider.settings.apiKey,
                },
              })
            } else if (value === "ollama") {
              onProviderChange({
                ...provider,
                type: "ollama",
                settings: { host: "" },
              })
            }
          }}
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="apiKey">
          API Key
        </label>
        <Input
          required
          id="apiKey"
          name="apiKey"
          placeholder="sk-..."
          type="password"
          value={provider.settings.apiKey || ""}
          onChange={(e) =>
            onProviderChange({
              ...provider,
              settings: { ...provider.settings, apiKey: e.target.value },
            })
          }
        />
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="host">
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
        <p className={s.helpText}>Custom OpenAI-compatible API endpoint</p>
      </div>
    </div>
  )
}
