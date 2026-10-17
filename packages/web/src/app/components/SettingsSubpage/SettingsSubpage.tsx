import { useNavigate } from "react-router"

import { PageHeader } from "../PageHeader"
import s from "./SettingsSubpage.module.css"
import { type SettingsSubpageProps } from "./types"

/**
 * Full-panel settings screen for creating or editing one item. With
 * `onSubmit` the content is a form: render dialogs that have their own form
 * (e.g. `ConfirmDialog`) next to the subpage, not inside it. Chromium stops a
 * nested form's submit event at the outer form, so React never handles it.
 */
export function SettingsSubpage({
  backTo,
  children,
  footer,
  onSubmit,
  title,
}: SettingsSubpageProps) {
  const navigate = useNavigate()
  const body = (
    <>
      <main className={s.content}>{children}</main>
      {footer ? <footer className={s.footer}>{footer}</footer> : null}
    </>
  )

  return (
    <div className={s.settingsSubpage}>
      <PageHeader title={title} onBack={() => void navigate(backTo)} />
      {onSubmit ? (
        <form noValidate className={s.form} onSubmit={onSubmit}>
          {body}
        </form>
      ) : (
        body
      )}
    </div>
  )
}
