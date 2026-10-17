import type { InputProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Input.module.css"

export const Input = ({
  className,
  invalid,
  variant = "primary",
  ...props
}: InputProps) => {
  return (
    <input
      aria-invalid={invalid || undefined}
      {...props}
      className={cn(s.input, className)}
      data-variant={variant}
    />
  )
}
