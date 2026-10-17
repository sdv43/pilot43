import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "../../../shared/cn"
import { IconButton } from "../IconButton"
import { Input } from "../Input"
import s from "./SecretInput.module.css"
import { type SecretInputProps } from "./types"

/** Masked input (API keys, tokens) with a show/hide button. */
export function SecretInput({ className, ...props }: SecretInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span className={cn(s.secretInput, className)}>
      <Input
        {...props}
        autoComplete="off"
        className={s.input}
        spellCheck={false}
        type={isVisible ? "text" : "password"}
      />
      <IconButton
        aria-label={isVisible ? "Hide value" : "Show value"}
        className={s.toggle}
        icon={isVisible ? <EyeOffIcon /> : <EyeIcon />}
        size="small"
        onClick={() => setIsVisible((value) => !value)}
      />
    </span>
  )
}
