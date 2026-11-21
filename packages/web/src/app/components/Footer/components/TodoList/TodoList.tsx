import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

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
import { itemHeightPx, maxVisibleItems } from "./const"
import s from "./TodoList.module.css"
import { type TodoListProps } from "./types"
import { getTodoListStats, parseTodoList } from "./utils"

/**
 * Plan tab tucked behind the composer card (Figma "Task Tracker"). Opening it
 * grows the tab upward into the full plan ("Plan Popover"), still tucked
 * behind the card, so it can't live in the popover top layer.
 */
export function TodoList({ className }: TodoListProps) {
  const sheetId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const collapseRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const workspace = useCurrentWorkspace()
  const chatId = useCurrentChatId()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { isPending: isClearing, mutate: clearTodoList } =
    useChatTodoListClear()
  const chat = chats?.find((item) => item.id === chatId)
  const items = parseTodoList(chat?.todoList ?? "")
  const stats = getTodoListStats(items)
  const isVisible = !!chat && items.length > 0

  // Light dismiss, like a popover: Escape or a press outside collapses it.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    collapseRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isOpen])

  if (!isVisible) {
    return null
  }

  const isCompleted = stats.completedCount === stats.totalCount
  const progress = (
    <span
      aria-hidden="true"
      className={s.progress}
      style={{
        width: `${(stats.completedCount / stats.totalCount) * 100}%`,
      }}
    />
  )

  function collapse() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={cn(s.todoList, className)}
      data-complete={isCompleted}
      data-testid="todo-list"
    >
      <button
        ref={triggerRef}
        aria-controls={sheetId}
        aria-expanded={isOpen}
        aria-label={`Plan (${stats.completedCount} of ${stats.totalCount} done)`}
        className={s.trigger}
        data-complete={isCompleted}
        data-testid="todo-list-trigger"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {progress}
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

      <div
        aria-label="Plan"
        className={s.sheet}
        hidden={!isOpen}
        id={sheetId}
        role="region"
      >
        {progress}
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
              clearTodoList(chat.id, { onSuccess: () => setIsOpen(false) })
            }
          />
          <IconButton
            ref={collapseRef}
            aria-label="Collapse plan"
            icon={<ChevronDownIcon />}
            size="small"
            title="Collapse"
            onClick={collapse}
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
      </div>
    </div>
  )
}
