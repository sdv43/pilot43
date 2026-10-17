import { ChevronDownIcon, ChevronRightIcon, ServerIcon } from "lucide-react"
import { useState } from "react"

import { Badge } from "../../../../../../../Badge"
import { Checkbox } from "../../../../../../../Checkbox"
import { Toggle } from "../../../../../../../Toggle"
import { collapsedToolCount } from "./const"
import s from "./ToolGroup.module.css"
import { type ToolGroupProps } from "./types"

/** A tool source with an on/off switch and its tools. */
export function ToolGroup({
  enabled,
  error,
  isLoading = false,
  name,
  onReconnect,
  onToggle,
  onToolToggle,
  tools,
}: ToolGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const onCount = tools.filter((tool) => tool.enabled).length
  const visibleTools = showAll ? tools : tools.slice(0, collapsedToolCount)

  return (
    <div
      className={s.toolGroup}
      data-expanded={isExpanded}
      data-testid="tool-group"
    >
      <div className={s.header}>
        <span aria-hidden="true" className={s.icon}>
          <ServerIcon />
        </span>
        <span className={s.text}>
          <span className={s.name}>{name}</span>
          {error ? (
            <span className={s.error}>
              {error}
              {onReconnect ? (
                <>
                  {" · "}
                  <button
                    className={s.reconnect}
                    type="button"
                    onClick={onReconnect}
                  >
                    Reconnect
                  </button>
                </>
              ) : null}
            </span>
          ) : (
            <span className={s.detail}>
              {isLoading
                ? "Loading tools…"
                : `${onCount} of ${tools.length} tools`}
            </span>
          )}
        </span>
        <button
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name} tools`}
          className={s.expand}
          disabled={tools.length === 0}
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
        <Toggle
          aria-label={name}
          checked={enabled}
          disabled={!!error}
          onChange={(event) => onToggle(event.target.checked)}
        />
      </div>
      {isExpanded ? (
        <div className={s.tools}>
          {visibleTools.map((tool) => (
            <label key={tool.name} className={s.tool}>
              <Checkbox
                aria-label={tool.label}
                checked={tool.enabled}
                onChange={(event) =>
                  onToolToggle(tool.name, event.target.checked)
                }
              />
              <span className={s.toolText}>
                <span className={s.toolName}>{tool.label}</span>
                {tool.description ? (
                  <span className={s.toolDescription}>{tool.description}</span>
                ) : null}
              </span>
              {tool.asksFirst ? <Badge tone="warning">Asks first</Badge> : null}
            </label>
          ))}
          {tools.length > collapsedToolCount ? (
            <button
              className={s.more}
              type="button"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll
                ? "Show fewer tools"
                : `Show ${tools.length - collapsedToolCount} more tools`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
