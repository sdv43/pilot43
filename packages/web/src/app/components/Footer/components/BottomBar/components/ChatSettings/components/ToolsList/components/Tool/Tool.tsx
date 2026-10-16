import type { ToolProps } from "./types"

import s from "./Tool.module.css"

export function Tool({ isEnabled, onChange, tool }: ToolProps) {
  return (
    <label className={s.tool}>
      <input
        checked={isEnabled}
        className={s.checkbox}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />

      <div className={s.toolInfo}>
        <span className={s.toolName}>{tool.name}</span>
        <span className={s.toolDescription}>
          {tool.shortDescription ?? tool.description}
        </span>
      </div>
    </label>
  )
}
