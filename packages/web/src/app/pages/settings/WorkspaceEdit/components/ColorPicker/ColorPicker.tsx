import { workspaceColors } from "@pilot43/protocol"

import { colorLabels } from "../../const"
import s from "./ColorPicker.module.css"
import { type ColorPickerProps } from "./types"

export function ColorPicker({ onChange, value }: ColorPickerProps) {
  return (
    <div aria-label="Color" className={s.colorPicker} role="radiogroup">
      {workspaceColors.map((color) => (
        <button
          key={color}
          aria-checked={color === value}
          aria-label={colorLabels[color]}
          className={s.swatch}
          data-color={color}
          role="radio"
          type="button"
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}
