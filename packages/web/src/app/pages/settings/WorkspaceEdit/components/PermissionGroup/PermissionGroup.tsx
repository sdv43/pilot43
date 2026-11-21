import {
  getToolPermissionGroup,
  resetToolPermissionGroup,
  setToolPermission,
  setToolPermissionGroupLevel,
} from "@pilot43/protocol"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { Toggle } from "../../../../../components/Toggle"
import { formatCount } from "../../../utils"
import { collapsedToolCount } from "../../const"
import { getToolDisplayName } from "../../utils"
import { PermissionControl } from "../PermissionControl"
import { PermissionToolRow } from "../PermissionToolRow"
import s from "./PermissionGroup.module.css"
import { type PermissionGroupProps } from "./types"

/**
 * A tool group (built-in tools or one MCP server): logo, an on/off switch for
 * servers, the group permission and its per-tool overrides.
 */
export function PermissionGroup({
  detail,
  enabled = true,
  logo,
  name,
  onChange,
  onEnabledChange,
  permissions,
  source,
  switchTestId,
  tools,
}: PermissionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const group = getToolPermissionGroup(permissions, source)
  const customCount = tools.filter((tool) => group.tools[tool.name]).length
  const disabledCount = tools.filter(
    (tool) => (group.tools[tool.name] ?? group.level) === "disabled",
  ).length
  const visibleTools = showAll ? tools : tools.slice(0, collapsedToolCount)
  const server = source.type === "mcp" ? source.server : undefined

  return (
    <div className={s.permissionGroup} data-testid="permission-group">
      <div className={s.header}>
        <button
          aria-expanded={isExpanded && enabled}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
          className={s.toggle}
          disabled={tools.length === 0 || !enabled}
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded && enabled ? <ChevronDownIcon /> : <ChevronRightIcon />}
          {logo}
          <span className={s.text}>
            <span className={s.name}>{name}</span>
            <span className={s.detail}>
              {!enabled
                ? `${formatCount(tools.length, "tool")} · off in this workspace`
                : (detail ??
                  [
                    formatCount(tools.length, "tool"),
                    customCount > 0 ? `${customCount} custom` : null,
                    disabledCount > 0 ? `${disabledCount} disabled` : null,
                  ]
                    .filter(Boolean)
                    .join(" · "))}
            </span>
          </span>
        </button>
        {enabled && customCount > 0 ? (
          <button
            className={s.reset}
            data-testid="permission-group-reset"
            title="Clear per-tool choices so every tool follows the group"
            type="button"
            onClick={() =>
              onChange(resetToolPermissionGroup(permissions, source))
            }
          >
            Reset
          </button>
        ) : null}
        {onEnabledChange ? (
          <Toggle
            aria-label={`Use ${name} in this workspace`}
            checked={enabled}
            data-testid={switchTestId}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
        ) : null}
        {enabled ? (
          <PermissionControl
            aria-label={`Permission for ${name}`}
            value={group.level}
            onChange={(level) =>
              onChange(setToolPermissionGroupLevel(permissions, source, level))
            }
          />
        ) : null}
      </div>
      {isExpanded && enabled ? (
        <div className={s.tools}>
          {visibleTools.map((tool) => (
            <PermissionToolRow
              key={tool.name}
              description={tool.description}
              isCustom={!!group.tools[tool.name]}
              name={getToolDisplayName(tool.name, server)}
              value={group.tools[tool.name] ?? group.level}
              onChange={(value) =>
                onChange(
                  setToolPermission(permissions, source, tool.name, value),
                )
              }
            />
          ))}
          {tools.length > collapsedToolCount ? (
            <button
              className={s.more}
              type="button"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll
                ? "Show fewer tools"
                : `Show ${formatCount(tools.length - collapsedToolCount, "more tool")}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
