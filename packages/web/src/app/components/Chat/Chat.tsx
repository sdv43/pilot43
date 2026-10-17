import { cn } from "../../../shared/cn"
import s from "./Chat.module.css"
import { MessageHistory } from "./components/MessageHistory"
import { type ChatProps } from "./types"

export function Chat({ className, ...props }: ChatProps) {
  return (
    <div
      {...props}
      aria-label="Chat"
      className={cn(s.chat, className)}
      role="region"
    >
      <MessageHistory />
    </div>
  )
}
