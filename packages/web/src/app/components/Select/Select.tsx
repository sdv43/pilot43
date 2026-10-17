import { ChevronDownIcon } from "lucide-react"

import type { SelectProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Select.module.css"

/** Native `<select>` styled to match the design. */
export function Select({
  children,
  className,
  icon,
  options,
  variant = "field",
  ...props
}: SelectProps) {
  return (
    <span className={cn(s.root, className)} data-variant={variant}>
      {icon ? (
        <span aria-hidden="true" className={s.icon}>
          {icon}
        </span>
      ) : null}
      <select className={s.select} data-has-icon={!!icon} {...props}>
        {options?.map((option) => (
          <option
            key={option.value}
            disabled={option.disabled}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDownIcon aria-hidden="true" className={s.chevron} />
    </span>
  )
}
