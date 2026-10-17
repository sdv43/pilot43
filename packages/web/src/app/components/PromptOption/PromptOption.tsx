import { CornerDownLeftIcon } from "lucide-react"

import { cn } from "../../../shared/cn"
import s from "./PromptOption.module.css"
import { type PromptOptionProps } from "./types"
import { splitHighlight } from "./utils"

/** A prompt in the `/` menu (and its preview in Settings). */
export function PromptOption({
  className,
  highlight,
  isSelected = false,
  preview,
  title,
  ...props
}: PromptOptionProps) {
  const { after, before, match } = splitHighlight(title, highlight)

  return (
    <div
      {...props}
      className={cn(s.promptOption, className)}
      data-selected={isSelected}
    >
      <span aria-hidden="true" className={s.icon}>
        /
      </span>
      <span className={s.text}>
        <span className={s.title}>
          {before}
          {match ? <mark className={s.match}>{match}</mark> : null}
          {after}
        </span>
        <span className={s.preview}>{preview}</span>
      </span>
      {isSelected ? (
        <span aria-hidden="true" className={s.enter}>
          <CornerDownLeftIcon />
        </span>
      ) : null}
    </div>
  )
}
