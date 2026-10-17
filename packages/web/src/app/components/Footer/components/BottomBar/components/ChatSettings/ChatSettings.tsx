import { resolveToolPermission } from "@pilot43/protocol"
import { ChevronDownIcon, SettingsIcon, WrenchIcon } from "lucide-react"
import { useCallback, useId, useRef, useState } from "react"
import { useNavigate } from "react-router"

import {
  useChatGetByWorkspace,
  useChatSettingsUpdate,
} from "../../../../../../../queries/chat"
import { useMcpServerGet } from "../../../../../../../queries/mcpServer"
import { useModelToolGet } from "../../../../../../../queries/model"
import { paths } from "../../../../../../../shared/routes"
import {
  buildChatSettingsFromToolsState,
  buildMcpServerToggleKey,
  buildNextToolState,
} from "../../../../../../../shared/tool-state"
import {
  useCurrentChatId,
  useCurrentWorkspace,
} from "../../../../../../../shared/useCurrentWorkspace"
import { Popover } from "../../../../../Popover"
import { footerActions } from "../../../../store"
import s from "./ChatSettings.module.css"
import { McpToolGroup } from "./components/McpToolGroup"
import { ToolGroup } from "./components/ToolGroup"
import { useToolsState } from "./hooks/useToolsState"
import { type ChatSettingsProps } from "./types"
import { getToolsChipLabel, isToolEnabled } from "./utils"

/** Tools chip of the composer: tools and MCP servers of this chat. */
export function ChatSettings({ className }: ChatSettingsProps) {
  const popoverId = useId()
  const anchorName = `--tools-picker-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const workspace = useCurrentWorkspace()
  const chatId = useCurrentChatId()
  const { data: chats } = useChatGetByWorkspace(workspace?.id)
  const { data: tools, isLoading } = useModelToolGet()
  const { data: allServers = [] } = useMcpServerGet()
  const { mutate: updateChatSettings } = useChatSettingsUpdate()
  const toolsState = useToolsState(tools)
  const chat = chats?.find((item) => item.id === chatId)
  const servers = allServers.filter(
    (server) =>
      !workspace?.mcpServers || workspace.mcpServers.includes(server.name),
  )
  const builtinTools = (tools ?? []).filter((tool) => !tool.hidden)
  const enabledServers = toolsState
    ? servers.filter(
        (server) => toolsState[buildMcpServerToggleKey(server.name)],
      ).length
    : 0

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      footerActions.setToolsState(next)

      if (chat) {
        updateChatSettings({
          chatId: chat.id,
          settings: {
            ...chat.settings,
            tools: buildChatSettingsFromToolsState(next).tools,
          },
        })
      }
    },
    [chat, updateChatSettings],
  )

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Tools"
        className={`${s.chip} ${className ?? ""}`}
        disabled={isLoading}
        popoverTarget={popoverId}
        style={{ anchorName }}
        type="button"
      >
        <WrenchIcon aria-hidden="true" className={s.chipIcon} />
        <span className={s.chipLabel}>{getToolsChipLabel(enabledServers)}</span>
        <ChevronDownIcon aria-hidden="true" className={s.chevron} />
      </button>
      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        aria-label="Tools for this chat"
        className={s.menu}
        id={popoverId}
        role="dialog"
        onOpenChange={setIsOpen}
      >
        {toolsState ? (
          <>
            <div className={s.header}>
              <h3 className={s.title}>Tools for this chat</h3>
              <span className={s.summary}>
                {servers.length === 1
                  ? "1 MCP server"
                  : `${servers.length} MCP servers`}{" "}
                in this workspace
              </span>
            </div>
            <ToolGroup
              enabled={builtinTools.some((tool) =>
                isToolEnabled(tool, toolsState),
              )}
              name="Built-in"
              tools={builtinTools.map((tool) => ({
                asksFirst:
                  resolveToolPermission(
                    workspace?.toolPermissions,
                    { type: "builtin" },
                    tool.name,
                  ) === "ask",
                description: tool.shortDescription ?? tool.description,
                enabled: isToolEnabled(tool, toolsState),
                label: tool.name,
                name: tool.name,
              }))}
              onToggle={(enabled) =>
                persist(
                  builtinTools.reduce(
                    (state, tool) =>
                      buildNextToolState(state, tool.name, enabled),
                    toolsState,
                  ),
                )
              }
              onToolToggle={(name, enabled) =>
                persist(buildNextToolState(toolsState, name, enabled))
              }
            />
            {servers.map((server) => (
              <McpToolGroup
                key={server.name}
                permissions={workspace?.toolPermissions}
                server={server}
                toolsState={toolsState}
                onChange={persist}
              />
            ))}
            <button
              className={s.manage}
              type="button"
              onClick={() => {
                popoverRef.current?.hidePopover()
                void navigate(paths.settings("mcp"))
              }}
            >
              <SettingsIcon aria-hidden="true" />
              Manage MCP servers
            </button>
          </>
        ) : null}
      </Popover>
    </>
  )
}
