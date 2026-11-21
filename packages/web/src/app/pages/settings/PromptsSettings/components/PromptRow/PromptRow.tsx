import { CopyPlusIcon, PencilIcon, TrashIcon } from "lucide-react"

import { Badge } from "../../../../../components/Badge"
import { IconButton } from "../../../../../components/IconButton"
import s from "./PromptRow.module.css"
import { type PromptRowProps } from "./types"

/**
 * A prompt in Settings. Actions show on hover or focus: Edit and Delete for
 * your prompts, Duplicate (an editable copy) for built-in ones.
 */
export function PromptRow({
  onDelete,
  onDuplicate,
  onEdit,
  prompt,
}: PromptRowProps) {
  return (
    <div className={s.promptRow} data-testid="prompt-row">
      <div className={s.text}>
        <div className={s.titleRow}>
          <span className={s.title}>{prompt.title}</span>
          {prompt.builtin ? <Badge>Built-in</Badge> : null}
        </div>
        <span className={s.preview}>{prompt.text}</span>
      </div>
      <span className={s.actions}>
        {prompt.builtin ? (
          <IconButton
            aria-label={`Duplicate ${prompt.title}`}
            icon={<CopyPlusIcon />}
            size="small"
            title="Duplicate"
            onClick={onDuplicate}
          />
        ) : (
          <>
            <IconButton
              aria-label={`Edit ${prompt.title}`}
              icon={<PencilIcon />}
              size="small"
              title="Edit"
              onClick={onEdit}
            />
            <IconButton
              aria-label={`Delete ${prompt.title}`}
              icon={<TrashIcon />}
              size="small"
              title="Delete"
              onClick={onDelete}
            />
          </>
        )}
      </span>
    </div>
  )
}
