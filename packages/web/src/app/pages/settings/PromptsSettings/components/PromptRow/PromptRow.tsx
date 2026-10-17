import { PencilIcon, TrashIcon } from "lucide-react"

import { Badge } from "../../../../../components/Badge"
import { IconButton } from "../../../../../components/IconButton"
import s from "./PromptRow.module.css"
import { type PromptRowProps } from "./types"

export function PromptRow({ onDelete, onEdit, prompt }: PromptRowProps) {
  return (
    <div className={s.promptRow} data-testid="prompt-row">
      <span aria-hidden="true" className={s.icon}>
        /
      </span>
      <div className={s.text}>
        <div className={s.titleRow}>
          <span className={s.title}>{prompt.title}</span>
          {prompt.builtin ? <Badge>Built-in</Badge> : null}
        </div>
        <span className={s.preview}>{prompt.text}</span>
      </div>
      {prompt.builtin ? null : (
        <span className={s.actions}>
          <IconButton
            aria-label={`Edit ${prompt.title}`}
            icon={<PencilIcon />}
            size="small"
            onClick={onEdit}
          />
          <IconButton
            aria-label={`Delete ${prompt.title}`}
            icon={<TrashIcon />}
            size="small"
            onClick={onDelete}
          />
        </span>
      )}
    </div>
  )
}
