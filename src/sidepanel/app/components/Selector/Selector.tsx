import { ChevronDown as ChevronDownIcon } from "lucide-react"
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"

import type { SelectorOption, SelectorProps } from "./types"

import { cn } from "../../../shared/cn"
import { Popover } from "../Popover"
import { OptionButton } from "./components/OptionButton"
import s from "./Selector.module.css"
import {
  flattenOptions,
  getFocusOnOpenTarget,
  getGroupsSignature,
  getOptionButtons,
  isOptionGroup,
} from "./utils"

export function Selector({
  className,
  collapsibleGroups = false,
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
  const previousGroupsSignatureRef = useRef<null | string>(null)
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    () => new Set(),
  )
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
  const groupsSignature = useMemo(() => getGroupsSignature(options), [options])

  // If the underlying option groups changed (e.g. the ModelSelector search
  // re-filters the model list), reset the collapse state so users don't get
  // stuck with stale, now-empty collapsed groups.
  if (
    collapsibleGroups &&
    groupsSignature !== previousGroupsSignatureRef.current
  ) {
    previousGroupsSignatureRef.current = groupsSignature
    setCollapsedGroupIds(new Set())
  }

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)

      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }

      return next
    })
  }

  function isGroupCollapsed(groupId: string) {
    return collapsedGroupIds.has(groupId)
  }

  function handlePopoverOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)

    if (nextOpen) {
      const pendingTarget = pendingFocusTargetRef.current

      if (pendingTarget) {
        pendingFocusTargetRef.current = null
        focusBoundaryOption(pendingTarget)
        return
      }

      focusOpenTarget()
      return
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false
      triggerRef.current?.focus()
    }
  }

  function handlePopoverKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !isOpen) {
      return
    }

    event.preventDefault()
    shouldRestoreFocusRef.current = true
    hidePopover()
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

  function focusOpenTarget() {
    getFocusOnOpenTarget(popoverRef.current)?.focus()
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
        onKeyDown={handlePopoverKeyDown}
        onOpenChange={handlePopoverOpenChange}
      >
        {!!header && <div className={s.header}>{header}</div>}

        <div className={s.options}>
          {options.map((entry) => {
            if (isOptionGroup(entry)) {
              const collapsed = collapsibleGroups && isGroupCollapsed(entry.id)

              return (
                <div
                  key={entry.id}
                  className={s.group}
                  data-collapsed={collapsed}
                >
                  {collapsibleGroups ? (
                    <button
                      aria-expanded={!collapsed}
                      className={s.groupToggle}
                      data-collapsed={collapsed}
                      data-rowgroupbutton="true"
                      type="button"
                      onClick={() => toggleGroupCollapsed(entry.id)}
                    >
                      <ChevronDownIcon
                        aria-hidden="true"
                        className={s.groupToggleIcon}
                        size={14}
                        strokeWidth={1.75}
                      />
                      <span className={s.groupLabel}>{entry.label}</span>
                    </button>
                  ) : (
                    <div className={s.groupLabel}>{entry.label}</div>
                  )}

                  {!collapsed && (
                    <>
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
                    </>
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
        </div>

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
