import { cn } from "../../../shared/cn"
import s from "./ChatNotice.module.css"
import { type ChatNoticeProps } from "./types"

/** Notice in the conversation: a paused run, an error, a rate limit. */
export function ChatNotice({
  actions,
  children,
  className,
  "data-testid": dataTestId,
  detail,
  icon,
  message,
  tone = "neutral",
}: ChatNoticeProps) {
  return (
    <div
      className={cn(s.chatNotice, className)}
      data-testid={dataTestId}
      data-tone={tone}
      role={tone === "neutral" ? "status" : "alert"}
    >
      <div className={s.body}>
        <span aria-hidden="true" className={s.icon}>
          {icon}
        </span>
        <div className={s.text}>
          <div className={s.message}>{message}</div>
          {detail ? <div className={s.detail}>{detail}</div> : null}
        </div>
      </div>
      {children}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  )
}
