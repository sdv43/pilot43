import {
  LoaderCircleIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  TrashIcon,
} from "lucide-react"

import { cn } from "../../../shared/cn"
import { IconButton } from "../IconButton"
import s from "./SessionRow.module.css"
import { type SessionRowProps } from "./types"

/** One chat in the history list, with pin/rename/delete on hover. */
export function SessionRow({
  chat,
  className,
  isActive = false,
  isGenerating = false,
  onDelete,
  onOpen,
  onRename,
  onTogglePin,
  time,
}: SessionRowProps) {
  const isPinned = !!chat.settings.pinned

  return (
    <div
      className={cn(s.row, className)}
      data-active={isActive}
      data-testid="session-row"
    >
      <button
        aria-current={isActive ? "page" : undefined}
        className={s.open}
        type="button"
        onClick={onOpen}
      >
        <span className={s.titleRow}>
          {isPinned ? <PinIcon aria-label="Pinned" className={s.pin} /> : null}
          {isGenerating ? (
            <LoaderCircleIcon aria-label="Generating" className={s.spinner} />
          ) : null}
          <span className={s.title}>{chat.title}</span>
        </span>
        {chat.preview ? (
          <span className={s.preview}>{chat.preview}</span>
        ) : null}
      </button>
      {time ? <span className={s.time}>{time}</span> : null}
      <span className={s.actions}>
        <IconButton
          aria-label={isPinned ? `Unpin ${chat.title}` : `Pin ${chat.title}`}
          icon={isPinned ? <PinOffIcon /> : <PinIcon />}
          size="small"
          title={isPinned ? "Unpin" : "Pin"}
          onClick={onTogglePin}
        />
        <IconButton
          aria-label={`Rename ${chat.title}`}
          icon={<PencilIcon />}
          size="small"
          title="Rename"
          onClick={onRename}
        />
        <IconButton
          aria-label={`Delete ${chat.title}`}
          icon={<TrashIcon />}
          size="small"
          title="Delete"
          onClick={onDelete}
        />
      </span>
    </div>
  )
}
