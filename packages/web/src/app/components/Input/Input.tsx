import type { InputProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Input.module.css"

export const Input = ({
  className,
  variant = "primary",
  ...props
}: InputProps) => {
  return (
    <input
      {...props}
      className={cn(
        s.input,
        variant === "transparent" && s.transparent,
        className,
      )}
    />
  )
}
