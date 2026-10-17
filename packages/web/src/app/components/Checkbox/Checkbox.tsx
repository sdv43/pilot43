import type { CheckboxProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Checkbox.module.css"

export function Checkbox({ className, label, ...props }: CheckboxProps) {
  const input = <input className={s.box} type="checkbox" {...props} />

  if (label === undefined) {
    return <span className={cn(s.root, className)}>{input}</span>
  }

  return (
    <label className={cn(s.root, s.item, className)}>
      {input}
      <span className={s.label}>{label}</span>
    </label>
  )
}
