import type { BadgeProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./Badge.module.css"

export function Badge({
  children,
  className,
  dot = false,
  icon,
  tone = "neutral",
  as = "span",
  type,
  ...props
}: BadgeProps) {
  const Component = as

  return (
    <Component
      className={cn(s.badge, className)}
      data-tone={tone}
      {...(as === "button" ? { type: type ?? "button" } : null)}
      {...props}
    >
      {dot ? <span aria-hidden="true" className={s.dot} /> : null}
      {icon ? (
        <span aria-hidden="true" className={s.icon}>
          {icon}
        </span>
      ) : null}
      {!!children && <span className={s.label}>{children}</span>}
    </Component>
  )
}
