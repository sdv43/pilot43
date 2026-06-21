import { useState } from "react"

import {
  buildNextMcpGroupToolsState,
  buildNextToolState,
  hydrateMcpGroupToolsState,
} from "@/sidepanel/shared/tool-state"

import type { ToolsListProps } from "./types"

import { McpGroup } from "./components/McpGroup"
import { Tool } from "./components/Tool"
import s from "./ToolsList.module.css"
import { isToolEnabled } from "./utils"

export function ToolsList({
  mcpServers,
  onChange,
  tools,
  toolsState,
}: ToolsListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({})
  const visibleTools = tools.filter((tool) => !tool.hidden)

  const handleToolChange = (toolName: string, isEnabled: boolean) => {
    onChange(buildNextToolState(toolsState, toolName, isEnabled))
  }

  const handleMcpGroupChange = (
    serverName: string,
    isEnabled: boolean,
    serverTools: typeof tools,
  ) => {
    onChange(
      buildNextMcpGroupToolsState(
        toolsState,
        serverName,
        serverTools,
        isEnabled,
      ),
    )
  }

  const handleMcpGroupHydration = (
    serverName: string,
    serverTools: typeof tools,
  ) => {
    const nextToolsState = hydrateMcpGroupToolsState(
      toolsState,
      serverName,
      serverTools,
    )

    if (nextToolsState !== toolsState) {
      onChange(nextToolsState)
    }
  }

  const handleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !(prev[groupName] ?? true),
    }))
  }

  return (
    <div className={s.toolsList}>
      <div className={s.header}>
        <h3 className={s.title}>Tools</h3>
      </div>

      <div className={s.items}>
        {visibleTools.map((tool) => (
          <Tool
            key={tool.name}
            isEnabled={isToolEnabled(tool, toolsState)}
            tool={tool}
            onChange={(isEnabled) => handleToolChange(tool.name, isEnabled)}
          />
        ))}

        {mcpServers.map((server) => (
          <McpGroup
            key={server.name}
            isCollapsed={collapsedGroups[server.name] ?? true}
            server={server}
            toolsState={toolsState}
            onChange={handleMcpGroupChange}
            onCollapse={handleGroupCollapse}
            onHydrateTools={handleMcpGroupHydration}
            onToolChange={handleToolChange}
          />
        ))}

        {visibleTools.length === 0 && mcpServers.length === 0 && (
          <p className={s.noTools}>No tools available</p>
        )}
      </div>
    </div>
  )
}
