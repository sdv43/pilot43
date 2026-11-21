import { RefreshCwIcon, ServerIcon } from "lucide-react"

import { useMcpServerToolsGet } from "../../../../../../queries/mcpServer"
import { ActionMenu } from "../../../../../components/ActionMenu"
import { Badge } from "../../../../../components/Badge"
import { BrandLogo, getUrlBrand } from "../../../../../components/BrandLogo"
import { Button } from "../../../../../components/Button"
import { formatCount } from "../../../utils"
import s from "./McpServerRow.module.css"
import { type McpServerRowProps } from "./types"

export function McpServerRow({ onDelete, onEdit, server }: McpServerRowProps) {
  const {
    data: tools,
    error,
    isFetching,
    refetch,
  } = useMcpServerToolsGet(server)
  const toolCount = tools?.filter((tool) => !tool.hidden).length ?? 0

  return (
    <div className={s.mcpServerRow} data-testid="mcp-server-row">
      <BrandLogo
        brand={getUrlBrand(server.url)}
        fallback={ServerIcon}
        size={32}
      />
      <div className={s.body}>
        <button className={s.text} type="button" onClick={onEdit}>
          <span className={s.name}>{server.name}</span>
          <span className={s.url}>{server.url}</span>
        </button>
        <span className={s.statusRow}>
          {isFetching && !tools ? (
            <Badge dot>Connecting…</Badge>
          ) : error ? (
            <>
              <Badge dot title={error.message} tone="danger">
                {error.message.length > 40
                  ? "Connection failed"
                  : error.message}
              </Badge>
              <Button
                data-testid="mcp-server-reconnect"
                icon={<RefreshCwIcon />}
                loading={isFetching}
                size="small"
                variant="secondary"
                onClick={() => void refetch()}
              >
                Reconnect
              </Button>
            </>
          ) : (
            <Badge dot tone="success">
              Connected · {formatCount(toolCount, "tool")}
            </Badge>
          )}
        </span>
      </div>
      <ActionMenu
        aria-label={`Actions for ${server.name}`}
        items={[
          { id: "edit", label: "Edit" },
          { id: "reconnect", label: "Reconnect" },
          { id: "delete", label: "Delete", tone: "danger" },
        ]}
        onSelect={(id) => {
          if (id === "edit") {
            onEdit()
          } else if (id === "reconnect") {
            void refetch()
          } else {
            onDelete()
          }
        }}
      />
    </div>
  )
}
