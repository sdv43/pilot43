import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { Badge } from "../../../../../../../Badge"
import { Checkbox } from "../../../../../../../Checkbox"
import { collapsedToolCount } from "./const"
import s from "./ToolGroup.module.css"
import { type ToolGroupProps } from "./types"

/**
 * A tool source and its tools. The checkbox is tri-state: all tools on,
 * some on (dash) or none.
 */
export function ToolGroup({
  enabled,
  error,
  isLoading = false,
  logo,
  name,
  onReconnect,
  onToggle,
  onToolToggle,
  tools,
}: ToolGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const onCount = tools.filter((tool) => tool.enabled).length
  const isPartial = enabled && onCount > 0 && onCount < tools.length
  const visibleTools = showAll ? tools : tools.slice(0, collapsedToolCount)

  return (
    <div
      className={s.toolGroup}
      data-expanded={isExpanded}
      data-testid="tool-group"
    >
      <div className={s.header}>
        {logo}
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
        <Checkbox
          aria-label={name}
          checked={enabled && !error && (tools.length === 0 || onCount > 0)}
          disabled={!!error}
          indeterminate={isPartial && !error}
          onChange={() => onToggle(isPartial ? true : !enabled)}
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
