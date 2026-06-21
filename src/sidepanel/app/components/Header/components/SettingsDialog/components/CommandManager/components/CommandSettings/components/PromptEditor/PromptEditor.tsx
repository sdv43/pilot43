import { type ComponentPropsWithRef, useId } from "react"

import { cn } from "@/sidepanel/shared/cn"

import s from "./PromptEditor.module.css"

export interface PromptEditorProps extends Omit<
  ComponentPropsWithRef<"textarea">,
  "onChange"
> {
  value: string
  onChange: (value: string) => void
}

/**
 * A multi-line textarea for editing command prompts. Mirrors the visual style
 * of the chat message editor while remaining a plain, controlled textarea so
 * it can later host placeholder autocomplete (e.g. `#currentPage`) without the
 * attachment/command machinery of the main editor.
 */
export function PromptEditor({
  className,
  value,
  onChange,
  ...props
}: PromptEditorProps) {
  const labelId = useId()

  return (
    <div className={cn(s.editor, className)}>
      <textarea
        {...props}
        aria-labelledby={props["aria-labelledby"] ?? labelId}
        className={s.textarea}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  )
}
