import { TrashIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "../../../Button"
import { Field } from "../../../Field"
import { Input } from "../../../Input"
import s from "./ConfirmDialogContent.module.css"
import { type ConfirmDialogContentProps } from "./types"

export function ConfirmDialogContent({
  children,
  confirmLabel,
  confirmText,
  icon,
  isPending = false,
  onConfirm,
  onOpenChange,
  title,
  tone = "danger",
}: ConfirmDialogContentProps) {
  const [typed, setTyped] = useState("")
  const isConfirmBlocked = confirmText !== undefined && typed !== confirmText

  return (
    <form
      className={s.confirmDialogContent}
      onSubmit={(event) => {
        event.preventDefault()

        if (!isConfirmBlocked && !isPending) {
          onConfirm()
        }
      }}
    >
      <span className={s.icon} data-tone={tone}>
        {icon ?? <TrashIcon />}
      </span>
      <h2 className={s.title}>{title}</h2>
      {children ? <div className={s.text}>{children}</div> : null}
      {confirmText !== undefined ? (
        <Field label={`Type ${confirmText} to confirm`}>
          {(control) => (
            <Input
              {...control}
              autoFocus
              autoComplete="off"
              data-testid="confirm-dialog-input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          )}
        </Field>
      ) : null}
      <div className={s.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          data-testid="confirm-dialog-confirm"
          disabled={isConfirmBlocked || isPending}
          type="submit"
          variant={tone}
        >
          {confirmLabel}
        </Button>
      </div>
    </form>
  )
}
