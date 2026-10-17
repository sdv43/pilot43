import type { McpServer } from "@pilot43/protocol"

import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"

import {
  useMcpServerGet,
  useMcpServerUpdate,
} from "../../../../queries/mcpServer"
import { paths } from "../../../../shared/routes"
import { Button } from "../../../components/Button"
import { Card } from "../../../components/Card"
import { ConfirmDialog } from "../../../components/ConfirmDialog"
import { SectionHeader } from "../../../components/SectionHeader"
import { toast } from "../../../components/ToastProvider"
import { McpServerRow } from "./components/McpServerRow"
import s from "./McpSettings.module.css"

/** `/settings/mcp` — remote MCP servers over HTTP. */
export function McpSettings() {
  const navigate = useNavigate()
  const { data: servers = [] } = useMcpServerGet()
  const { isPending, mutate: updateServers } = useMcpServerUpdate()
  const [deleting, setDeleting] = useState<McpServer | null>(null)

  return (
    <div className={s.mcpSettings}>
      <section aria-labelledby="settings-mcp" className={s.section}>
        <SectionHeader
          action={
            <Button
              data-testid="add-mcp-server"
              icon={<PlusIcon />}
              size="small"
              variant="ghost"
              onClick={() => void navigate(paths.settingsNew("mcp"))}
            >
              Add server
            </Button>
          }
          id="settings-mcp"
          title={`Servers · ${servers.length}`}
        />
        {servers.length > 0 ? (
          <Card>
            {servers.map((server) => (
              <McpServerRow
                key={server.name}
                server={server}
                onDelete={() => setDeleting(server)}
                onEdit={() =>
                  void navigate(paths.settingsItem("mcp", server.name))
                }
              />
            ))}
          </Card>
        ) : (
          <p className={s.empty}>
            Connect a remote MCP server over HTTP to give chats more tools.
          </p>
        )}
      </section>
      <ConfirmDialog
        confirmLabel="Delete server"
        isPending={isPending}
        open={!!deleting}
        title={`Delete “${deleting?.name ?? ""}”?`}
        onConfirm={() =>
          deleting &&
          updateServers(
            servers.filter((server) => server.name !== deleting.name),
            {
              onError: (error) => {
                toast(`Failed to delete server: ${error.message}`, "error")
              },
              onSuccess: () => setDeleting(null),
            },
          )
        }
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <p>Its tools are removed from every workspace.</p>
      </ConfirmDialog>
    </div>
  )
}
