import {
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react"
import { useId, useRef } from "react"

import {
  useChatGetByWorkspace,
  useChatTodoListClear,
} from "../../../../../queries/chat"
import { cn } from "../../../../../shared/cn"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../../shared/useCurrentWorkspace"
import { IconButton } from "../../../IconButton"
import { Popover } from "../../../Popover"
import { itemHeightPx, maxVisibleItems } from "./const"
import s from "./TodoList.module.css"
import { type TodoListProps } from "./types"
import { getTodoListStats, parseTodoList } from "./utils"

/** Compact plan tracker pinned above the composer. */
export function TodoList({ className }: TodoListProps) {
  const popoverId = useId()
  const anchorName = `--todo-list-anchor-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const workspace = useCurrentWorkspace()
  const chatId = useCurrentChatId()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { isPending: isClearing, mutate: clearTodoList } =
    useChatTodoListClear()
  const chat = chats?.find((item) => item.id === chatId)
  const items = parseTodoList(chat?.todoList ?? "")
  const stats = getTodoListStats(items)

  if (!chat || items.length === 0) {
    return null
  }

  const isCompleted = stats.completedCount === stats.totalCount
  const progress = `${(stats.completedCount / stats.totalCount) * 100}%`

  return (
    <div className={cn(s.todoList, className)} data-testid="todo-list">
      <button
        aria-label={`Plan (${stats.completedCount} of ${stats.totalCount} done)`}
        className={s.trigger}
        data-complete={isCompleted}
        data-testid="todo-list-trigger"
        popoverTarget={popoverId}
        style={{ anchorName }}
        type="button"
      >
        <span
          aria-hidden="true"
          className={s.progress}
          style={{ width: progress }}
        />
        {isCompleted ? (
          <CircleCheckIcon aria-hidden="true" className={s.doneIcon} />
        ) : (
          <LoaderCircleIcon aria-hidden="true" className={s.activeIcon} />
        )}
        <span className={s.current}>
          {stats.inProgress?.label ?? (isCompleted ? "All tasks done" : "Plan")}
        </span>
        <span className={s.counter} data-testid="todo-list-counter">
          {stats.completedCount} / {stats.totalCount}
        </span>
        <ChevronUpIcon aria-hidden="true" className={s.chevron} />
      </button>

      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        aria-label="Plan"
        className={s.popover}
        id={popoverId}
      >
        <div className={s.header}>
          <ListChecksIcon aria-hidden="true" className={s.headerIcon} />
          <span className={s.title}>Plan</span>
          <span className={s.summary}>
            {stats.completedCount} of {stats.totalCount} done
          </span>
          <IconButton
            aria-label="Clear todo list"
            data-testid="todo-list-clear"
            disabled={isClearing}
            icon={<Trash2Icon />}
            size="small"
            title="Clear plan"
            onClick={() =>
              clearTodoList(chat.id, {
                onSuccess: () => popoverRef.current?.hidePopover(),
              })
            }
          />
        </div>
        <div
          className={s.items}
          style={{
            maxHeight: `${Math.min(items.length, maxVisibleItems) * itemHeightPx}px`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className={s.item}
              data-status={item.status}
              data-testid="todo-list-item"
            >
              {item.status === "completed" ? (
                <CircleCheckIcon aria-hidden="true" className={s.itemIcon} />
              ) : item.status === "in_progress" ? (
                <LoaderCircleIcon aria-hidden="true" className={s.itemIcon} />
              ) : (
                <CircleIcon aria-hidden="true" className={s.itemIcon} />
              )}
              <span className={s.label}>{item.label}</span>
            </div>
          ))}
        </div>
      </Popover>
    </div>
  )
}
