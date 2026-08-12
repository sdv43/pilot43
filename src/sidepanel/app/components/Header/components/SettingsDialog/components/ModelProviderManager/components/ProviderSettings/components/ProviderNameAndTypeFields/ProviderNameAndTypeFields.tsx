import { Input } from "@/sidepanel/app/components/Input"
import { Selector } from "@/sidepanel/app/components/Selector"

import type { ProviderNameAndTypeFieldsProps } from "./types"

import sSettings from "../../ProviderSettings.module.css"
import { useProviderTypeOptions } from "./hooks/useProviderTypeOptions"

export function ProviderNameAndTypeFields({
  name,
  namePlaceholder,
  type,
  onNameChange,
  onTypeChange,
}: ProviderNameAndTypeFieldsProps) {
  const typeOptions = useProviderTypeOptions()

  return (
    <div>
      <div className={sSettings.field}>
        <label className={sSettings.label} htmlFor="name">
          Name
        </label>
        <Input
          required
          id="name"
          name="name"
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div className={sSettings.field}>
        <label className={sSettings.label} htmlFor="type">
          Type
        </label>
        <Selector
          id="type"
          name="type"
          options={typeOptions}
          placeholder="Select provider type"
          popoverClassName={sSettings.selectorPopover}
          value={type}
          variant="input"
          onValueChange={onTypeChange}
        />
      </div>
    </div>
  )
}
