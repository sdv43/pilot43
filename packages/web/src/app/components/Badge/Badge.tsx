import type { BadgeProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Badge.module.css"

export function Badge({
  children,
  className,
  icon,
  variant = "default",
  as = "div",
  type,
  ...props
}: BadgeProps) {
  const Component = as

  return (
    <Component
      className={cn(s.badge, className)}
      data-variant={variant}
      {...(as === "button" ? { type: type ?? "button" } : null)}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className={s.icon}>
          {icon}
        </span>
      ) : null}
      {!!children && <span className={s.label}>{children}</span>}
    </Component>
  )
}
