import { type ReactNode } from "react"

import { cn } from "@/sidepanel/shared/cn"

import s from "./HighlightedValue.module.css"
import { type HighlightedValueProps } from "./types"

export const HighlightedValue = ({
  className,
  placeholder,
  ref,
  value,
  ...props
}: HighlightedValueProps) => {
  function renderContent() {
    if (value.text.length === 0) {
      return <span className={s.placeholder}>{placeholder}</span>
    }

    const nodes: ReactNode[] = []
    let cursor = 0

    for (const command of value.commands) {
      if (command.start > cursor) {
        nodes.push(
          <span key={`text-${cursor}`}>
            {value.text.slice(cursor, command.start)}
          </span>,
        )
      }

      nodes.push(
        <span
          data-command-key={command.key}
          key={`command-${command.start}-${command.end}`}
          className={s.commandToken}
          data-has-error={command.isError ? "true" : undefined}
          data-has-option={command.option ? "true" : undefined}
          data-testid="editor-command-token"
        >
          {value.text.slice(command.start, command.end)}
        </span>,
      )

      cursor = command.end
    }

    if (cursor < value.text.length) {
      nodes.push(<span key={`text-${cursor}`}>{value.text.slice(cursor)}</span>)
    }

    if (value.text.endsWith("\n")) {
      nodes.push(<br key="trailing-newline" />)
    }

    return nodes
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(s.highlights, className)}
      {...props}
    >
      {renderContent()}
    </div>
  )
}
