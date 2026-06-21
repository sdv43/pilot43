import { AlertCircleIcon } from "lucide-react"
import { useEffect } from "react"

import { Badge } from "@/sidepanel/app/components/Badge"
import { Loader } from "@/sidepanel/app/components/Loader"
import { useMcpServerToolsGet } from "@/sidepanel/queries/mcpServer"
import { buildMcpServerToggleKey } from "@/sidepanel/shared/tool-state"

import type { McpGroupProps } from "./types"

import { isToolEnabled } from "../../utils"
import { Tool } from "../Tool"
import s from "./McpGroup.module.css"

const loadingErrorMessage = "Failed to load MCP server tools."

export function McpGroup({
  isCollapsed,
  server,
  toolsState,
  onChange,
  onCollapse,
  onHydrateTools,
  onToolChange,
}: McpGroupProps) {
  const {
    data: serverTools = [],
    error,
    isError,
    isLoading,
  } = useMcpServerToolsGet(server)
  const isEnabled = toolsState[buildMcpServerToggleKey(server.name)] ?? false
  const showToggleLoader = isEnabled && isLoading

  useEffect(() => {
    if (isError || isLoading || !isEnabled || serverTools.length === 0) {
      return
    }

    if (serverTools.every((tool) => toolsState[tool.name] !== undefined)) {
      return
    }

    onHydrateTools(server.name, serverTools)
  }, [
    isEnabled,
    isError,
    isLoading,
    onHydrateTools,
    server.name,
    serverTools,
    toolsState,
  ])

  const handleGroupChange = (nextEnabled: boolean) => {
    onChange(server.name, nextEnabled, serverTools)
  }

  const errorMessage =
    error instanceof Error ? error.message : loadingErrorMessage

  return (
    <div className={s.mcpGroup}>
      <div className={s.groupHeader}>
        {showToggleLoader ? (
          <div className={s.groupLabel}>
            <span className={s.checkboxLoader}>
              <Loader className={s.loader} size={14} />
            </span>

            <div className={s.groupInfo}>
              <span className={s.groupName}>
                <span>{server.name}</span>
                <Badge variant="outline">mcp</Badge>
              </span>
            </div>
          </div>
        ) : (
          <label className={s.groupLabel}>
            <input
              checked={isEnabled}
              className={s.checkbox}
              type="checkbox"
              onChange={(event) => handleGroupChange(event.target.checked)}
            />

            <div className={s.groupInfo}>
              <span className={s.groupName}>
                <span>{server.name}</span>
                <Badge variant="outline">mcp</Badge>
              </span>
            </div>
          </label>
        )}

        <div className={s.groupActions}>
          {isError && (
            <AlertCircleIcon
              aria-label="MCP server error"
              className={s.errorIcon}
              size={14}
            />
          )}

          <button
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed
                ? `Expand ${server.name} tools`
                : `Collapse ${server.name} tools`
            }
            className={s.collapseButton}
            type="button"
            onClick={() => onCollapse(server.name)}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className={s.groupTools}>
          {isLoading && (
            <div className={s.mcpStatus}>
              <Loader className={s.loader} size={14} />
              <span>Loading tools...</span>
            </div>
          )}

          {isError && <div className={s.mcpError}>{errorMessage}</div>}

          {!isLoading &&
            !isError &&
            (serverTools.length === 0 ? (
              <p className={s.mcpStatus}>No tools available</p>
            ) : (
              serverTools.map((tool) => (
                <Tool
                  key={tool.name}
                  isEnabled={isToolEnabled(tool, toolsState)}
                  tool={tool}
                  onChange={(isToolEnabledNext) =>
                    onToolChange(tool.name, isToolEnabledNext)
                  }
                />
              ))
            ))}
        </div>
      )}
    </div>
  )
}
