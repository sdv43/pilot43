import { cn } from "../../../shared/cn"
import s from "./Textarea.module.css"
import { type TextareaProps } from "./types"

export function Textarea({ className, mono = false, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(s.textarea, className)}
      data-mono={mono}
      {...props}
    />
  )
}
