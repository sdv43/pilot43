import type { ToggleProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Toggle.module.css"

/** On/off switch rendered from a native checkbox with `role="switch"`. */
export function Toggle({ className, ...props }: ToggleProps) {
  return (
    <input
      className={cn(s.toggle, className)}
      role="switch"
      type="checkbox"
      {...props}
    />
  )
}
