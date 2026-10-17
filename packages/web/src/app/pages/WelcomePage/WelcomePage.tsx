import { SparklesIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Navigate, useNavigate } from "react-router"

import { useWorkspaceCreate, useWorkspaceGet } from "../../../queries/workspace"
import { paths } from "../../../shared/routes"
import { Button } from "../../components/Button"
import { Field } from "../../components/Field"
import { Input } from "../../components/Input"
import { toast } from "../../components/ToastProvider"
import s from "./WelcomePage.module.css"

/** First-run screen shown while no workspace exists. */
export function WelcomePage() {
  const navigate = useNavigate()
  const { data: workspaces } = useWorkspaceGet()
  const { isPending, mutate: createWorkspace } = useWorkspaceCreate()
  const [name, setName] = useState("Personal")

  if (workspaces && workspaces.length > 0) {
    return <Navigate replace to={paths.home()} />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()

    if (!trimmed) {
      return
    }

    createWorkspace(
      { name: trimmed },
      {
        onError: (error) => {
          toast(`Failed to create workspace: ${error.message}`, "error")
        },
        onSuccess: (workspace) => {
          void navigate(paths.chat(workspace.id), { replace: true })
        },
      },
    )
  }

  return (
    <main className={s.page}>
      <form className={s.card} onSubmit={handleSubmit}>
        <span className={s.icon}>
          <SparklesIcon />
        </span>
        <h1 className={s.title}>Welcome to Pilot43</h1>
        <p className={s.text}>
          Chats live in workspaces. Each workspace has its own chats, system
          prompt, MCP servers and tool permissions.
        </p>
        <Field label="Workspace name">
          {(control) => (
            <Input
              {...control}
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Button disabled={isPending || !name.trim()} type="submit">
          Create workspace
        </Button>
      </form>
    </main>
  )
}
