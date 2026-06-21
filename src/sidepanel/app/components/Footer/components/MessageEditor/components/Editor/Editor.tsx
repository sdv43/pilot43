import {
  type ChangeEvent,
  type CSSProperties,
  useId,
  useRef,
  useState,
} from "react"

import { cn } from "@/sidepanel/shared/cn"
import { mergeRef } from "@/sidepanel/shared/mergeRef"

import {
  type ActiveAutocompleteCommand,
  Autocomplete,
} from "./components/Autocomplete"
import { HighlightedValue } from "./components/HighlightedValue"
import s from "./Editor.module.css"
import { useCaretTracking } from "./hooks/useCaretTracking"
import { useSelection } from "./hooks/useSelection"
import { useSyncScroll } from "./hooks/useSyncScroll"
import { type EditorCommandOption, type EditorProps } from "./types"
import { prepareValue } from "./utils"

export const Editor = ({
  className,
  commands,
  onValueChange,
  placeholder = "Type a message...",
  ref,
  style,
  value,
  ...props
}: EditorProps) => {
  const baseId = useId()
  const anchorName = `--message-editor-anchor-${baseId.replace(/:/g, "")}`
  const popoverId = `${baseId}-autocomplete`
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const highlightsRef = useRef<HTMLDivElement | null>(null)
  const mergedRef = mergeRef(textareaRef, ref)

  const [isTextareaFocused, setIsTextareaFocused] = useState(false)

  const syncScroll = useSyncScroll(textareaRef, highlightsRef)
  const { selection, updateSelection } = useSelection()
  const { caretCoordinates, updateCaretCoordinates } =
    useCaretTracking(textareaRef)

  function handleSelectOption(
    option: EditorCommandOption,
    activeCommand: ActiveAutocompleteCommand,
  ) {
    if (option.disabled) {
      return
    }

    const command = `${option.type === "slash" ? "/" : "#"}${option.command}`
    const before = value.text.slice(0, activeCommand.start)
    const after = value.text.slice(activeCommand.end)
    const nextCursorPosition = before.length + command.length + 1

    onValueChange?.(
      prepareValue(
        {
          text: `${before}${command} ${after}`,
          commands: [
            ...value.commands,
            {
              option,
              key: option.key,
              start: activeCommand.start,
              end: before.length + command.length,
              type: option.type,
              command: option.command,
            },
          ],
        },
        commands,
      ),
    )

    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.focus()
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget

    onValueChange?.(
      prepareValue(
        {
          text: textarea.value,
          commands: value.commands,
        },
        commands,
      ),
    )
    updateSelection(textarea.selectionStart, textarea.selectionEnd)
    updateCaretCoordinates(textarea.selectionStart)
  }

  function handleFocus() {
    const textarea = textareaRef.current
    if (!textarea) return

    setIsTextareaFocused(true)
    updateSelection(textarea.selectionStart, textarea.selectionEnd)
    updateCaretCoordinates(textarea.selectionStart)
  }

  function handleBlur() {
    setIsTextareaFocused(false)
  }

  function handleScroll() {
    syncScroll()

    if (textareaRef.current) {
      updateCaretCoordinates(textareaRef.current.selectionStart)
    }
  }

  function handleSelectionChange() {
    const textarea = textareaRef.current
    if (!textarea) return

    updateSelection(textarea.selectionStart, textarea.selectionEnd)
    updateCaretCoordinates(textarea.selectionStart)
  }

  return (
    <div
      className={cn(s.editor, className)}
      style={
        {
          ...style,
          "--message-editor-caret-anchor-name": anchorName,
        } as CSSProperties
      }
    >
      <HighlightedValue
        ref={highlightsRef}
        placeholder={placeholder}
        value={value}
      />

      <textarea
        ref={mergedRef}
        className={s.textarea}
        placeholder={placeholder}
        spellCheck={false}
        value={value.text}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        onScroll={handleScroll}
        onSelect={handleSelectionChange}
        {...props}
      />

      {caretCoordinates && (
        <div
          aria-hidden="true"
          className={s.caretAnchor}
          style={{
            height: `${caretCoordinates.height}px`,
            left: `${caretCoordinates.left}px`,
            top: `${caretCoordinates.top}px`,
          }}
        />
      )}

      <Autocomplete
        anchorName={anchorName}
        commands={value.commands}
        id={popoverId}
        isTextareaFocused={isTextareaFocused}
        options={commands}
        selectionEnd={selection.end}
        selectionStart={selection.start}
        text={value.text}
        textareaRef={textareaRef}
        onSelect={handleSelectOption}
      />
    </div>
  )
}
