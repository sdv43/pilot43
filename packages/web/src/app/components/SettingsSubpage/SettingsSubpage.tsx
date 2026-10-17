import { useNavigate } from "react-router"

import { PageHeader } from "../PageHeader"
import s from "./SettingsSubpage.module.css"
import { type SettingsSubpageProps } from "./types"

/** Full-panel settings screen for creating or editing one item. */
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
