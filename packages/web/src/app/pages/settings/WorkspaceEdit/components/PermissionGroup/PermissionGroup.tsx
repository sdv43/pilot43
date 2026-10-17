import {
  getToolPermissionGroup,
  setToolPermission,
  setToolPermissionGroupLevel,
} from "@pilot43/protocol"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"

import { formatCount } from "../../../utils"
import { collapsedToolCount } from "../../const"
import { getToolDisplayName } from "../../utils"
import { PermissionControl } from "../PermissionControl"
import { PermissionToolRow } from "../PermissionToolRow"
import s from "./PermissionGroup.module.css"
import { type PermissionGroupProps } from "./types"

/** A tool group (built-in tools or one MCP server) with its tool overrides. */
export function PermissionGroup({
  detail,
  name,
  onChange,
  permissions,
  source,
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
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
          className={s.toggle}
          disabled={tools.length === 0}
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <span className={s.text}>
            <span className={s.name}>{name}</span>
            <span className={s.detail}>
              {detail ??
                [
                  formatCount(tools.length, "tool"),
                  customCount > 0 ? `${customCount} custom` : null,
                  disabledCount > 0 ? `${disabledCount} disabled` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
            </span>
          </span>
        </button>
        <PermissionControl
          aria-label={`Permission for ${name}`}
          value={group.level}
          onChange={(level) =>
            onChange(setToolPermissionGroupLevel(permissions, source, level))
          }
        />
      </div>
      {isExpanded ? (
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
