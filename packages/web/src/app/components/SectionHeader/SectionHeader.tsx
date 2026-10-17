import { cn } from "../../../shared/cn"
import s from "./SectionHeader.module.css"
import { type SectionHeaderProps } from "./types"

/** Uppercase overline title above a settings card, with an optional action. */
export function SectionHeader({
  action,
  className,
  id,
  title,
}: SectionHeaderProps) {
  return (
    <div className={cn(s.header, className)}>
      <h3 className={s.title} id={id}>
        {title}
      </h3>
      {action}
    </div>
  )
}
