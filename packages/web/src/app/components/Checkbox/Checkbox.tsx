import type { CheckboxProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Checkbox.module.css"

export function Checkbox({
  className,
  indeterminate = false,
  label,
  ref,
  ...props
}: CheckboxProps) {
  const input = (
    <input
      ref={(node) => {
        // `indeterminate` is a DOM property only; there is no HTML attribute.
        if (node) node.indeterminate = indeterminate
        if (typeof ref === "function") return ref(node)
        if (ref) ref.current = node
      }}
      aria-checked={indeterminate ? "mixed" : undefined}
      className={s.box}
      type="checkbox"
      {...props}
    />
  )

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
