import { type FormEvent, useState } from "react"

import type { Command } from "@/shared/api"

import { Button } from "@/sidepanel/app/components/Button"
import { Dialog } from "@/sidepanel/app/components/Dialog"
import { Input } from "@/sidepanel/app/components/Input"
import { useCommandCreate, useCommandUpdate } from "@/sidepanel/queries/command"

import s from "./CommandSettings.module.css"
import { PromptEditor } from "./components/PromptEditor"

const commandCharacterRegexNot = /[^\p{L}\p{N}.:_-]/gu

interface CommandSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  command: Command | null
}

function createDefaultCommand(): Command {
  return {
    id: "",
    name: "",
    prompt: "",
    builtin: false,
  }
}

export function CommandSettings({
  open,
  onOpenChange,
  command,
}: CommandSettingsProps) {
  const createMutation = useCommandCreate()
  const updateMutation = useCommandUpdate()
  const [formData, setFormData] = useState<Command>(
    () => command ?? createDefaultCommand(),
  )
  const [error, setError] = useState<null | string>(null)

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedName = formData.name.trim()

    if (!trimmedName) {
      setError("Command name is required")
      return
    }

    if (!formData.prompt.trim()) {
      setError("Command prompt is required")
      return
    }

    try {
      if (command) {
        await updateMutation.mutateAsync({
          ...formData,
          name: trimmedName,
        })
      } else {
        await createMutation.mutateAsync({
          name: trimmedName,
          prompt: formData.prompt,
          description: formData.description,
        })
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save command")
    }
  }

  return (
    <Dialog
      open={open}
      title={command ? "Edit Command" : "Add Command"}
      onOpenChange={onOpenChange}
    >
      <form className={s.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={s.field}>
          <label className={s.label} htmlFor="commandName">
            Name
          </label>
          <Input
            id="commandName"
            name="commandName"
            placeholder="my-command"
            value={formData.name}
            onChange={(e) => {
              const sanitized = e.target.value.replace(
                commandCharacterRegexNot,
                "",
              )
              setFormData({ ...formData, name: sanitized })
            }}
          />
          <p className={s.helpText}>
            Used as <code>/{formData.name || "name"}</code> at the start of a
            message. Only letters, numbers, and <code>.:_-</code> are allowed.
          </p>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="commandDescription">
            Description
          </label>
          <Input
            id="commandDescription"
            name="commandDescription"
            placeholder="Optional short description"
            value={formData.description ?? ""}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value })
            }}
          />
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="commandPrompt">
            Prompt
          </label>
          <PromptEditor
            id="commandPrompt"
            name="commandPrompt"
            placeholder="Prompt text that replaces the command when the message is sent..."
            value={formData.prompt}
            onChange={(value) => {
              setFormData({ ...formData, prompt: value })
            }}
          />
          <p className={s.helpText}>
            This text replaces the command when building the message sent to the
            model. Placeholder autocomplete (e.g. <code>#currentPage</code>)
            will be added in a future version.
          </p>
        </div>

        {error && <div className={s.error}>{error}</div>}

        <div className={s.formActions}>
          <Button
            disabled={isSubmitting}
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit" variant="primary">
            {isSubmitting
              ? "Saving..."
              : command
                ? "Save Changes"
                : "Add Command"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
