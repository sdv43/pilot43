import { CheckIcon, LoaderIcon, Trash2Icon } from "lucide-react"
import { useId, useRef } from "react"

import {
  useChatGetByWorkspace,
  useChatTodoListClear,
} from "@/sidepanel/queries/chat"
import { cn } from "@/sidepanel/shared/cn"
import { useCurrentWorkspace } from "@/sidepanel/shared/useCurrentWorkspace"

import { IconButton } from "../../../IconButton"
import { Popover } from "../../../Popover"
import s from "./TodoList.module.css"
import { type TodoListProps } from "./types"
import { getTodoListStats, parseTodoList } from "./utils"

/** Maximum number of items visible before the popover body scrolls. */
const maxVisibleItems = 5
const itemHeightPx = 24

export function TodoList({ className, ...props }: TodoListProps) {
  const popoverId = useId()
  const anchorName = `--todo-list-anchor-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const workspace = useCurrentWorkspace()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { isPending: isClearing, mutate: clearTodoList } =
    useChatTodoListClear()

  const selectedChat = chats?.find(
    (chat) => chat.id === workspace?.lastSelectedChatId,
  )
  const todos = selectedChat?.todoList ?? ""
  const items = parseTodoList(todos)
  const stats = getTodoListStats(items)

  if (items.length === 0) {
    return null
  }

  const counter = `${stats.completedCount}/${stats.totalCount}`
  const isCompleted = stats.completedCount === stats.totalCount
  const TriggerIcon = isCompleted ? CheckIcon : LoaderIcon

  const handleClear = () => {
    if (!selectedChat) {
      return
    }

    clearTodoList(selectedChat?.id, {
      onSuccess: () => {
        popoverRef.current?.hidePopover()
      },
    })
  }

  return (
    <div {...props} className={cn(s.root, className)} data-testid="todo-list">
      <button
        aria-label={`Todo list (${counter} completed)`}
        className={s.trigger}
        data-complete={isCompleted ? "true" : undefined}
        data-testid="todo-list-trigger"
        popoverTarget={popoverId}
        style={{ anchorName: anchorName }}
        type="button"
      >
        <TriggerIcon
          className={cn(s.triggerIcon, isCompleted && s.triggerIconCompleted)}
          size={12}
        />
        <span className={s.triggerLabel}>
          {stats.inProgress
            ? stats.inProgress.label
            : stats.completedCount === stats.totalCount
              ? "All tasks completed"
              : "Todo list"}
        </span>
        <span className={s.counter} data-testid="todo-list-counter">
          {counter}
        </span>
        <IconButton
          aria-label="Clear todo list"
          className={s.clearButton}
          data-testid="todo-list-clear"
          disabled={isClearing}
          icon={<Trash2Icon size={12} />}
          title="Clear todo list"
          variant="secondary"
          onClick={handleClear}
        />
      </button>

      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        className={s.popover}
        id={popoverId}
      >
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
              <span className={s.marker}>
                {item.status === "completed" ? <CheckIcon size={12} /> : null}
              </span>
              <span className={s.label}>{item.label}</span>
            </div>
          ))}
        </div>
      </Popover>
    </div>
  )
}
