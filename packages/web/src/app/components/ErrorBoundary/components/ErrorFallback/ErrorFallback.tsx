import { Button } from "../../../Button"
import s from "./ErrorFallback.module.css"
import { type ErrorFallbackProps } from "./types"
import { getErrorMessage } from "./utils"

/** Full-screen error message with a reload button. */
export function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <div className={s.errorFallback} role="alert">
      <h1 className={s.title}>Something went wrong.</h1>
      <div className={s.message}>{getErrorMessage(error)}</div>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  )
}
