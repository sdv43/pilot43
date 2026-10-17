import { type FormEvent, useState } from "react"

import { useChatTitleUpdate } from "../../../../../../../queries/chat"
import { Button } from "../../../../../../components/Button"
import { Field } from "../../../../../../components/Field"
import { Input } from "../../../../../../components/Input"
import s from "./RenameChatForm.module.css"
import { type RenameChatFormProps } from "./types"

export function RenameChatForm({ chat, onClose }: RenameChatFormProps) {
  const [title, setTitle] = useState(chat.title)
  const [error, setError] = useState<null | string>(null)
  const { isPending, mutate: updateTitle } = useChatTitleUpdate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = title.trim()

    if (!trimmed) {
      setError("Chat title is required")
      return
    }

    updateTitle(
      { chatId: chat.id, title: trimmed },
      {
        onError: (updateError) => setError(updateError.message),
        onSuccess: onClose,
      },
    )
  }

  return (
    <form className={s.renameChatForm} onSubmit={handleSubmit}>
      <Field error={error} label="Title">
        {(control) => (
          <Input
            {...control}
            autoFocus
            data-testid="rename-chat-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        )}
      </Field>
      <div className={s.actions}>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isPending} type="submit">
          Save
        </Button>
      </div>
    </form>
  )
}
