import { ChevronRightIcon } from "lucide-react"

import type { SettingsRowProps } from "./types"

import { cn } from "../../../shared/cn"
import s from "./SettingsRow.module.css"

export function SettingsRow({
  className,
  control,
  description,
  htmlFor,
  leading,
  onClick,
  title,
  tone = "default",
  "data-testid": dataTestId,
}: SettingsRowProps) {
  const TitleTag = htmlFor ? "label" : "span"
  const content = (
    <>
      {leading}
      <span className={s.text}>
        <TitleTag className={s.title} htmlFor={htmlFor}>
          {title}
        </TitleTag>
        {description ? (
          <span className={s.description}>{description}</span>
        ) : null}
      </span>
      {control}
    </>
  )

  if (onClick) {
    return (
      <button
        className={cn(s.row, s.interactive, className)}
        data-testid={dataTestId}
        data-tone={tone}
        type="button"
        onClick={onClick}
      >
        {content}
        <ChevronRightIcon aria-hidden="true" className={s.chevron} />
      </button>
    )
  }

  return (
    <div
      className={cn(s.row, className)}
      data-testid={dataTestId}
      data-tone={tone}
    >
      {content}
    </div>
  )
}
