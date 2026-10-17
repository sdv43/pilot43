import { Navigate, useParams } from "react-router"

import { useMcpServerGet } from "../../../../queries/mcpServer"
import { paths } from "../../../../shared/routes"
import { McpServerForm } from "./components/McpServerForm"

/** `/settings/mcp/new` and `/settings/mcp/:serverName`. */
export function McpServerEdit() {
  const { serverName } = useParams()
  const { data: servers } = useMcpServerGet()
  const server = servers?.find((item) => item.name === serverName)

  if (!servers) {
    return null
  }

  if (serverName && !server) {
    return <Navigate replace to={paths.settings("mcp")} />
  }

  return (
    <McpServerForm
      key={server?.name ?? "new"}
      server={server}
      servers={servers}
    />
  )
}
