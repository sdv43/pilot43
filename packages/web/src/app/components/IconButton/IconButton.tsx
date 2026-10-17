import type { IconButtonProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./IconButton.module.css"

export function IconButton({
  className,
  icon,
  size = "default",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(s.iconButton, className)}
      data-size={size}
      data-variant={variant}
      type="button"
      {...props}
    >
      {icon}
    </button>
  )
}
