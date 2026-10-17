import { CircleCheckIcon, CircleXIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "../Button"
import s from "./ConnectionResult.module.css"
import { noItems, visibleItemCount } from "./const"
import { type ConnectionResultProps } from "./types"

/** Result of testing a provider or MCP server connection. */
export function ConnectionResult({
  isTesting = false,
  items = noItems,
  message,
  onRetest,
  success,
}: ConnectionResultProps) {
  const visible = items.slice(0, visibleItemCount)
  const hidden = items.length - visible.length

  return (
    <div
      className={s.connectionResult}
      data-success={success}
      data-testid="connection-result"
      role="status"
    >
      <div className={s.header}>
        {success ? <CircleCheckIcon /> : <CircleXIcon />}
        <span className={s.message}>{message}</span>
        {onRetest ? (
          <Button
            disabled={isTesting}
            icon={<RefreshCwIcon />}
            size="small"
            variant="ghost"
            onClick={onRetest}
          >
            Test again
          </Button>
        ) : null}
      </div>
      {visible.length > 0 ? (
        <div className={s.items}>
          {visible.map((item) => (
            <span key={item} className={s.item}>
              {item}
            </span>
          ))}
          {hidden > 0 ? <span className={s.item}>+{hidden} more</span> : null}
        </div>
      ) : null}
    </div>
  )
}
