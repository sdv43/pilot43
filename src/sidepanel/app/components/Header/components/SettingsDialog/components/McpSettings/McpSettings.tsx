import { useMcpServerGet } from "@/sidepanel/queries/mcpServer"

import { McpSettingsForm } from "./components/McpSettingsForm"
import s from "./McpSettings.module.css"

export function McpSettings() {
  const { data: servers, isLoading } = useMcpServerGet()

  if (isLoading || !servers) {
    return (
      <section className={s.container}>
        <div className={s.header}>
          <h3 className={s.title}>MCP Servers</h3>
        </div>
        <div className={s.loading}>Loading...</div>
      </section>
    )
  }

  return <McpSettingsForm key="mcp-settings" initialServers={servers} />
}
