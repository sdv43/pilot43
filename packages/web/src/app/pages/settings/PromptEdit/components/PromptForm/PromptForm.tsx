import { promptTextMaxLength } from "@pilot43/protocol"
import { TrashIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router"

import {
  usePromptCreate,
  usePromptDelete,
  usePromptUpdate,
} from "../../../../../../queries/prompt"
import { paths } from "../../../../../../shared/routes"
import { Button } from "../../../../../components/Button"
import { ConfirmDialog } from "../../../../../components/ConfirmDialog"
import { Field } from "../../../../../components/Field"
import { Input } from "../../../../../components/Input"
import { PromptOption } from "../../../../../components/PromptOption"
import { SettingsSubpage } from "../../../../../components/SettingsSubpage"
import { Textarea } from "../../../../../components/Textarea"
import { toast } from "../../../../../components/ToastProvider"
import { getTitleHelper } from "../../utils"
import s from "./PromptForm.module.css"
import { type PromptFormProps } from "./types"

export function PromptForm({ prompt }: PromptFormProps) {
  const navigate = useNavigate()
  const backTo = paths.settings("prompts")
  const [title, setTitle] = useState(prompt?.title ?? "")
  const [text, setText] = useState(prompt?.text ?? "")
  const [errors, setErrors] = useState<{ text?: string; title?: string }>({})
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { isPending: isCreating, mutate: createPrompt } = usePromptCreate()
  const { isPending: isUpdating, mutate: updatePrompt } = usePromptUpdate()
  const { isPending: isDeleting, mutate: deletePrompt } = usePromptDelete()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = {
      text: text.trim() ? undefined : "Prompt text is required",
      title: title.trim() ? undefined : "Title is required",
    }

    if (nextErrors.text || nextErrors.title) {
      setErrors(nextErrors)
      return
    }

    const options = {
      onError: (error: Error) => {
        toast(`Failed to save prompt: ${error.message}`, "error")
      },
      onSuccess: () => void navigate(backTo),
    }

    if (prompt) {
      updatePrompt({ ...prompt, text, title: title.trim() }, options)
    } else {
      createPrompt({ text, title: title.trim() }, options)
    }
  }

  return (
    <SettingsSubpage
      backTo={backTo}
      footer={
        <>
          {prompt ? (
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
            data-testid="prompt-save"
            disabled={isCreating || isUpdating}
            type="submit"
          >
            Save prompt
          </Button>
        </>
      }
      title={prompt ? "Edit prompt" : "New prompt"}
      onSubmit={handleSubmit}
    >
      <Field error={errors.title} helper={getTitleHelper(title)} label="Title">
        {(control) => (
          <Input
            {...control}
            autoFocus={!prompt}
            data-testid="prompt-title-input"
            placeholder="Summarize page"
            value={title}
            onChange={(event) => {
              setErrors({})
              setTitle(event.target.value)
            }}
          />
        )}
      </Field>
      <Field
        error={errors.text}
        label="Prompt text"
        labelAction={
          <span className={s.counter}>
            {text.length.toLocaleString("en-US")} /{" "}
            {promptTextMaxLength.toLocaleString("en-US")}
          </span>
        }
      >
        {(control) => (
          <Textarea
            {...control}
            className={s.text}
            data-testid="prompt-text-input"
            maxLength={promptTextMaxLength}
            placeholder="Text inserted into the message box"
            value={text}
            onChange={(event) => {
              setErrors({})
              setText(event.target.value)
            }}
          />
        )}
      </Field>
      <div className={s.preview}>
        <span className={s.label}>Preview in the / menu</span>
        <div className={s.previewBox}>
          <PromptOption
            isSelected
            preview={text.replace(/\s+/g, " ").trim() || "Prompt text"}
            title={title.trim() || "Title"}
          />
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete prompt"
        isPending={isDeleting}
        open={isDeleteOpen}
        title={`Delete “${prompt?.title ?? ""}”?`}
        onConfirm={() =>
          prompt &&
          deletePrompt(prompt.id, {
            onError: (error) => {
              toast(`Failed to delete prompt: ${error.message}`, "error")
            },
            onSuccess: () => void navigate(backTo),
          })
        }
        onOpenChange={setIsDeleteOpen}
      />
    </SettingsSubpage>
  )
}
