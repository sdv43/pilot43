import { Input } from "@/sidepanel/app/components/Input"

import type { ProviderApiKeyFieldProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"

export function ProviderApiKeyField({
  placeholder,
  value,
  onChange,
}: ProviderApiKeyFieldProps) {
  return (
    <div>
      <div className={sSettings.field}>
        <label className={sSettings.label} htmlFor="apiKey">
          API Key
        </label>
        <Input
          required
          id="apiKey"
          name="apiKey"
          placeholder={placeholder}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
