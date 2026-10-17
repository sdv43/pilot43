import { renameMcpServerInWorkspace } from "@pilot43/protocol"
import { PlugZapIcon, TrashIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import { useMcpServerUpdate } from "../../../../../../queries/mcpServer"
import {
  useWorkspaceGet,
  useWorkspaceUpdate,
} from "../../../../../../queries/workspace"
import { paths } from "../../../../../../shared/routes"
import { Button } from "../../../../../components/Button"
import { ConfirmDialog } from "../../../../../components/ConfirmDialog"
import { ConnectionResult } from "../../../../../components/ConnectionResult"
import { Field } from "../../../../../components/Field"
import { Input } from "../../../../../components/Input"
import { SettingsSubpage } from "../../../../../components/SettingsSubpage"
import { toast } from "../../../../../components/ToastProvider"
import { formatCount } from "../../../utils"
import { useMcpServerTest } from "../../hooks/useMcpServerTest"
import { type McpServerDraft } from "../../types"
import {
  createMcpServerDraft,
  draftToMcpServer,
  getMcpToolDisplayName,
  validateMcpServerDraft,
} from "../../utils"
import { HeadersEditor } from "../HeadersEditor"
import s from "./McpServerForm.module.css"
import { type McpServerFormProps } from "./types"

export function McpServerForm({ server, servers }: McpServerFormProps) {
  const navigate = useNavigate()
  const backTo = paths.settings("mcp")
  const [draft, setDraft] = useState(() => createMcpServerDraft(server))
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({})
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { isTesting, reset, result, test } = useMcpServerTest()
  const { isPending, mutate: updateServers } = useMcpServerUpdate()
  const { data: workspaces = [] } = useWorkspaceGet()
  const { mutateAsync: updateWorkspace } = useWorkspaceUpdate()

  function change(patch: Partial<McpServerDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    reset()
  }

  function runTest() {
    const nextErrors = validateMcpServerDraft(draft, [], undefined)

    if (nextErrors.url) {
      setErrors(nextErrors)
      return
    }

    test(draftToMcpServer({ ...draft, name: draft.name || "test" }, server))
  }

  function save(nextServers: typeof servers, onSaved: () => void) {
    updateServers(nextServers, {
      onError: (error) => {
        toast(`Failed to save MCP servers: ${error.message}`, "error")
      },
      onSuccess: onSaved,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateMcpServerDraft(draft, servers, server?.name)

    if (nextErrors.name || nextErrors.url) {
      setErrors(nextErrors)
      return
    }

    const next = draftToMcpServer(draft, server)
    const nextServers = server
      ? servers.map((item) => (item.name === server.name ? next : item))
      : [...servers, next]

    save(nextServers, () => {
      if (server && server.name !== next.name) {
        // Keep workspace allowlists and permissions pointing at the server.
        void Promise.all(
          workspaces.map((workspace) =>
            updateWorkspace(
              renameMcpServerInWorkspace(workspace, server.name, next.name),
            ),
          ),
        )
      }

      void navigate(backTo)
    })
  }

  return (
    <SettingsSubpage
      backTo={backTo}
      footer={
        <>
          {server ? (
            <Button
              icon={<TrashIcon />}
              variant="danger-ghost"
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          ) : null}
          <span className={s.spacer} />
          <Button variant="secondary" onClick={() => void navigate(backTo)}>
            Cancel
          </Button>
          <Button
            data-testid="mcp-server-save"
            disabled={isPending}
            type="submit"
          >
            {server ? "Save changes" : "Add server"}
          </Button>
        </>
      }
      title={server ? `Edit MCP server · ${server.name}` : "Add MCP server"}
      onSubmit={handleSubmit}
    >
      <Field error={errors.name} label="Name">
        {(control) => (
          <Input
            {...control}
            autoFocus={!server}
            data-testid="mcp-server-name-input"
            placeholder="github"
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
          />
        )}
      </Field>
      <Field error={errors.url} label="Server URL">
        {(control) => (
          <Input
            {...control}
            className={s.mono}
            data-testid="mcp-server-url-input"
            placeholder="https://mcp.example.com/mcp"
            value={draft.url}
            onChange={(event) => change({ url: event.target.value })}
          />
        )}
      </Field>
      <HeadersEditor
        headers={draft.headers}
        onChange={(headers) => change({ headers })}
      />
      {result ? (
        <ConnectionResult
          isTesting={isTesting}
          items={
            result.success
              ? result.tools.map((tool) => getMcpToolDisplayName(tool.name))
              : undefined
          }
          message={
            result.success
              ? `Connected · ${formatCount(result.tools.length, "tool")} discovered`
              : result.message
          }
          success={result.success}
          onRetest={runTest}
        />
      ) : (
        <Button
          className={s.test}
          data-testid="mcp-server-test"
          disabled={isTesting || !draft.url.trim()}
          icon={<PlugZapIcon />}
          size="small"
          variant="secondary"
          onClick={runTest}
        >
          {isTesting ? "Testing…" : "Test connection"}
        </Button>
      )}

      <ConfirmDialog
        confirmLabel="Delete server"
        isPending={isPending}
        open={isDeleteOpen}
        title={`Delete “${server?.name ?? ""}”?`}
        onConfirm={() =>
          server &&
          save(
            servers.filter((item) => item.name !== server.name),
            () => void navigate(backTo),
          )
        }
        onOpenChange={setIsDeleteOpen}
      >
        <p>Its tools are removed from every workspace.</p>
      </ConfirmDialog>
    </SettingsSubpage>
  )
}
