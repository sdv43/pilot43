import { LoaderCircleIcon } from "lucide-react"

import type { ButtonProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Button.module.css"

export function Button({
  children,
  className,
  disabled,
  icon,
  loading = false,
  size = "default",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const leading = loading ? <LoaderCircleIcon className={s.spinner} /> : icon

  return (
    <button
      aria-busy={loading || undefined}
      className={cn(s.button, className)}
      data-loading={loading || undefined}
      data-size={size}
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {leading ? (
        <span aria-hidden="true" className={s.icon}>
          {leading}
        </span>
      ) : null}
      {!!children && <span className={s.label}>{children}</span>}
    </button>
  )
}
