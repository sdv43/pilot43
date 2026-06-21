import type { ButtonProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Button.module.css"

export function Button({
  children,
  className,
  icon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(s.button, className)}
      data-variant={variant}
      type={type}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className={s.icon}>
          {icon}
        </span>
      ) : null}
      {!!children && <span className={s.label}>{children}</span>}
    </button>
  )
}
