import { workspaceSystemPromptMaxLength } from "@pilot43/protocol"
import { TrashIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import { useModelToolGet } from "../../../../../../queries/model"
import {
  useWorkspaceCreate,
  useWorkspaceUpdate,
} from "../../../../../../queries/workspace"
import { paths } from "../../../../../../shared/routes"
import { Button } from "../../../../../components/Button"
import { Card } from "../../../../../components/Card"
import { Field } from "../../../../../components/Field"
import { Input } from "../../../../../components/Input"
import { SettingsSubpage } from "../../../../../components/SettingsSubpage"
import { Textarea } from "../../../../../components/Textarea"
import { toast } from "../../../../../components/ToastProvider"
import { WorkspaceAvatar } from "../../../../../components/WorkspaceAvatar"
import { DeleteWorkspaceDialog } from "../../../WorkspacesSettings/components/DeleteWorkspaceDialog"
import { useWorkspaceDraft } from "../../hooks/useWorkspaceDraft"
import { ColorPicker } from "../ColorPicker"
import { McpPermissionGroup } from "../McpPermissionGroup"
import { McpServerToggleRow } from "../McpServerToggleRow"
import { PermissionGroup } from "../PermissionGroup"
import { type WorkspaceFormProps } from "./types"
import s from "./WorkspaceForm.module.css"

export function WorkspaceForm({ servers, workspace }: WorkspaceFormProps) {
  const navigate = useNavigate()
  const backTo = paths.settings("workspaces")
  const { draft, update } = useWorkspaceDraft(workspace, servers)
  const [nameError, setNameError] = useState<null | string>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { data: tools = [] } = useModelToolGet()
  const { isPending: isCreating, mutate: createWorkspace } =
    useWorkspaceCreate()
  const { isPending: isUpdating, mutate: updateWorkspace } =
    useWorkspaceUpdate()
  const enabledServers = servers.filter((server) =>
    draft.mcpServers.includes(server.name),
  )
  const builtinTools = tools
    .filter((tool) => !tool.hidden)
    .map((tool) => ({
      description: tool.shortDescription ?? tool.description,
      name: tool.name,
    }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = draft.name.trim()

    if (!name) {
      setNameError("Workspace name is required")
      return
    }

    const options = {
      onError: (error: Error) => {
        toast(`Failed to save workspace: ${error.message}`, "error")
      },
      onSuccess: () => void navigate(backTo),
    }

    if (workspace) {
      updateWorkspace({ ...workspace, ...draft, name }, options)
    } else {
      createWorkspace({ ...draft, name }, options)
    }
  }

  return (
    <SettingsSubpage
      backTo={backTo}
      footer={
        <>
          {workspace ? (
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
            data-testid="workspace-save"
            disabled={isCreating || isUpdating}
            type="submit"
          >
            {workspace ? "Save changes" : "Create workspace"}
          </Button>
        </>
      }
      title={workspace ? "Edit workspace" : "New workspace"}
      onSubmit={handleSubmit}
    >
      <div className={s.identity}>
        <WorkspaceAvatar
          className={s.avatar}
          size="large"
          workspace={{ color: draft.color, name: draft.name || "?" }}
        />
        <Field className={s.name} error={nameError} label="Name">
          {(control) => (
            <Input
              {...control}
              autoFocus={!workspace}
              data-testid="workspace-name-input"
              value={draft.name}
              onChange={(event) => {
                setNameError(null)
                update({ name: event.target.value })
              }}
            />
          )}
        </Field>
      </div>

      <div className={s.group}>
        <span className={s.label}>Color</span>
        <ColorPicker
          value={draft.color}
          onChange={(color) => update({ color })}
        />
      </div>

      <Field
        label="System prompt"
        labelAction={
          <span className={s.counter}>
            {draft.systemPrompt.length.toLocaleString("en-US")} /{" "}
            {workspaceSystemPromptMaxLength.toLocaleString("en-US")}
          </span>
        }
      >
        {(control) => (
          <Textarea
            {...control}
            data-testid="workspace-system-prompt"
            maxLength={workspaceSystemPromptMaxLength}
            placeholder="Instructions added to every chat in this workspace"
            value={draft.systemPrompt}
            onChange={(event) => update({ systemPrompt: event.target.value })}
          />
        )}
      </Field>

      <div className={s.group}>
        <span className={s.label}>MCP servers available in this workspace</span>
        {servers.length > 0 ? (
          <Card>
            {servers.map((server) => (
              <McpServerToggleRow
                key={server.name}
                enabled={draft.mcpServers.includes(server.name)}
                server={server}
                onToggle={(enabled) =>
                  update({
                    mcpServers: enabled
                      ? [...draft.mcpServers, server.name]
                      : draft.mcpServers.filter((name) => name !== server.name),
                  })
                }
              />
            ))}
          </Card>
        ) : (
          <p className={s.hint}>
            No MCP servers yet. Add them in Settings → MCP.
          </p>
        )}
      </div>

      <div className={s.group}>
        <span className={s.label}>Tool permissions</span>
        <p className={s.hint}>
          Tools set to “Ask” pause the chat for approval. Disabled tools are
          hidden from chats. Changing a group resets its tool overrides.
        </p>
        <Card>
          <PermissionGroup
            name="Built-in tools"
            permissions={draft.toolPermissions}
            source={{ type: "builtin" }}
            tools={builtinTools}
            onChange={(toolPermissions) => update({ toolPermissions })}
          />
          {enabledServers.map((server) => (
            <McpPermissionGroup
              key={server.name}
              permissions={draft.toolPermissions}
              server={server}
              onChange={(toolPermissions) => update({ toolPermissions })}
            />
          ))}
        </Card>
      </div>

      <DeleteWorkspaceDialog
        workspace={isDeleteOpen ? (workspace ?? null) : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => void navigate(backTo)}
      />
    </SettingsSubpage>
  )
}
