import { ChevronDown as ChevronDownIcon } from "lucide-react"
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useId,
  useRef,
  useState,
} from "react"

import type { SelectorOption, SelectorProps } from "./types"

import { cn } from "../../../shared/cn"
import { Popover } from "../Popover"
import { OptionButton } from "./components/OptionButton"
import s from "./Selector.module.css"
import { flattenOptions, getOptionButtons, isOptionGroup } from "./utils"

export function Selector({
  className,
  defaultValue,
  footer,
  header,
  noOptionsMessage,
  name,
  onClick,
  onKeyDown,
  onValueChange,
  options,
  placeholder = "Select",
  style,
  value,
  variant = "primary",
  popoverClassName,
  ...props
}: SelectorProps) {
  const baseId = useId()
  const anchorName = `--selector-anchor-${baseId.replace(/:/g, "")}`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const pendingFocusTargetRef = useRef<"first" | "last" | null>(null)
  const shouldRestoreFocusRef = useRef(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)

  const isControlled = value !== undefined
  const selectedValue = isControlled ? value : internalValue
  const flatOptions = flattenOptions(options)
  const selectedOption = flatOptions.find(
    (option) => option.value === selectedValue,
  )
  const triggerId = `${baseId}-trigger`
  const popoverId = `${baseId}-popover`

  function handlePopoverOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)

    if (nextOpen) {
      const pendingTarget = pendingFocusTargetRef.current

      if (pendingTarget) {
        pendingFocusTargetRef.current = null
        focusBoundaryOption(pendingTarget)
      }

      return
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false
      triggerRef.current?.focus()
    }
  }

  function openPopover() {
    popoverRef.current?.showPopover()
  }

  function hidePopover() {
    popoverRef.current?.hidePopover()
  }

  function moveFocus(currentTarget: HTMLButtonElement, direction: -1 | 1) {
    const optionButtons = getOptionButtons(popoverRef.current)
    const currentIndex = optionButtons.indexOf(currentTarget)

    if (currentIndex === -1 || optionButtons.length === 0) {
      return
    }

    const nextIndex =
      (currentIndex + direction + optionButtons.length) % optionButtons.length
    optionButtons[nextIndex]?.focus()
  }

  function focusBoundaryOption(target: "first" | "last") {
    const optionButtons = getOptionButtons(popoverRef.current)

    if (optionButtons.length === 0) {
      return
    }

    if (target === "first") {
      optionButtons[0]?.focus()
      return
    }

    optionButtons.at(-1)?.focus()
  }

  function handleTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event)

    if (event.defaultPrevented) {
      return
    }

    if (isOpen) {
      popoverRef.current?.hidePopover()
      return
    }

    popoverRef.current?.showPopover()
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event)

    if (event.defaultPrevented) {
      return
    }

    switch (event.key) {
      case " ":
      case "Enter": {
        event.preventDefault()

        if (isOpen) {
          hidePopover()
          return
        }

        openPopover()
        break
      }
      case "ArrowDown": {
        event.preventDefault()

        if (isOpen) {
          focusBoundaryOption("first")
          return
        }

        pendingFocusTargetRef.current = "first"
        openPopover()
        break
      }
      case "ArrowUp": {
        event.preventDefault()

        if (isOpen) {
          focusBoundaryOption("last")
          return
        }

        pendingFocusTargetRef.current = "last"
        openPopover()
        break
      }
      case "Escape": {
        if (!isOpen) {
          return
        }

        event.preventDefault()
        hidePopover()
        break
      }
      default:
        break
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        moveFocus(event.currentTarget, 1)
        break
      }
      case "ArrowUp": {
        event.preventDefault()
        moveFocus(event.currentTarget, -1)
        break
      }
      case "End": {
        event.preventDefault()
        focusBoundaryOption("last")
        break
      }
      case "Escape": {
        shouldRestoreFocusRef.current = true
        hidePopover()
        break
      }
      case "Home": {
        event.preventDefault()
        focusBoundaryOption("first")
        break
      }
      default:
        break
    }
  }

  function handleOptionSelect(option: SelectorOption) {
    if (option.disabled) {
      return
    }

    if (!isControlled) {
      setInternalValue(option.value)
    }

    onValueChange?.(option.value, option)
    shouldRestoreFocusRef.current = true
    hidePopover()
  }

  return (
    <div
      className={cn(s.selector, className)}
      data-variant={variant}
      style={{ "--popover-anchor-name": anchorName, ...style } as CSSProperties}
    >
      <button
        {...props}
        ref={triggerRef}
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={s.trigger}
        data-open={isOpen}
        id={triggerId}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          data-el-value
          className={cn(s.value, !selectedOption && s.placeholder)}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDownIcon
          aria-hidden="true"
          className={s.icon}
          size={16}
          strokeWidth={1.75}
        />
      </button>

      {name ? (
        <input name={name} type="hidden" value={selectedOption?.value ?? ""} />
      ) : null}

      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        className={popoverClassName}
        id={popoverId}
        role="listbox"
        onOpenChange={handlePopoverOpenChange}
      >
        {!!header && <div className={s.header}>{header}</div>}

        {options.map((entry) => {
          if (isOptionGroup(entry)) {
            return (
              <div key={entry.id} className={s.group}>
                <div className={s.groupLabel}>{entry.label}</div>

                {entry.options.map((option) => (
                  <OptionButton
                    key={option.value}
                    option={option}
                    selectedOption={selectedOption}
                    onKeyDown={handleOptionKeyDown}
                    onSelect={handleOptionSelect}
                  />
                ))}

                {!!entry.error && (
                  <div className={s.groupError}>{entry.error}</div>
                )}
              </div>
            )
          }

          return (
            <OptionButton
              key={entry.value}
              option={entry}
              selectedOption={selectedOption}
              onKeyDown={handleOptionKeyDown}
              onSelect={handleOptionSelect}
            />
          )
        })}

        {options.length === 0 ? (
          <div className={s.noOptionsMessage}>
            {noOptionsMessage ?? "No options"}
          </div>
        ) : null}

        {!!footer && <div className={s.footer}>{footer}</div>}
      </Popover>
    </div>
  )
}
