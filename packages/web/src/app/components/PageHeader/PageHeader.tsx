import { ArrowLeftIcon } from "lucide-react"

import { cn } from "../../../shared/cn"
import { IconButton } from "../IconButton"
import s from "./PageHeader.module.css"
import { type PageHeaderProps } from "./types"

/** Top bar of full-panel screens: back button, title and optional action. */
export function PageHeader({
  action,
  backLabel = "Back",
  children,
  className,
  onBack,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header className={cn(s.header, className)}>
      <div className={s.bar}>
        {onBack ? (
          <IconButton
            aria-label={backLabel}
            icon={<ArrowLeftIcon />}
            onClick={onBack}
          />
        ) : null}
        <div className={s.titles}>
          <h1 className={s.title}>{title}</h1>
          {subtitle ? <div className={s.subtitle}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </header>
  )
}
