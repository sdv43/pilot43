import type { PageContent, PageContentSelection } from "@pilot43/protocol"

import {
  GlobeIcon,
  PaperclipIcon,
  TextSelectIcon,
  UploadIcon,
} from "lucide-react"
import { useId, useRef, useState } from "react"

import { Button } from "../../../../../Button"
import { Checkbox } from "../../../../../Checkbox"
import { IconButton } from "../../../../../IconButton"
import { Popover } from "../../../../../Popover"
import { useHandleFilesAttached } from "../../../../hooks/useHandleFilesAttached"
import s from "./AttachMenu.module.css"
import { type AttachMenuProps } from "./types"
import {
  getAttachTabsLabel,
  getHost,
  getSelectionOption,
  getTabOptions,
} from "./utils"

/** Paperclip menu: upload files, attach the page selection or open tabs. */
export function AttachMenu({ onUploadFiles, textareaRef }: AttachMenuProps) {
  const popoverId = useId()
  const anchorName = `--attach-menu-${popoverId.replace(/:/g, "")}`
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const { commands, insertOptions } = useHandleFilesAttached(textareaRef)
  const tabs = getTabOptions(commands)
  const selection = getSelectionOption(commands)
  const selectionAttachment = selection?.attachment as
    PageContentSelection | undefined

  function close() {
    popoverRef.current?.hidePopover()
  }

  return (
    <>
      <IconButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Attach files"
        data-testid="message-editor-attach-button"
        icon={<PaperclipIcon />}
        popoverTarget={popoverId}
        size="small"
        style={{ anchorName }}
        title="Attach"
      />
      <Popover
        ref={popoverRef}
        anchorName={anchorName}
        aria-label="Attach"
        className={s.attachMenu}
        id={popoverId}
        role="menu"
        onOpenChange={(open) => {
          setIsOpen(open)
          setSelectedKeys([])
        }}
      >
        <button
          className={s.action}
          role="menuitem"
          type="button"
          onClick={() => {
            close()
            onUploadFiles()
          }}
        >
          <span aria-hidden="true" className={s.actionIcon}>
            <UploadIcon />
          </span>
          <span className={s.actionText}>
            <span className={s.actionTitle}>Upload files</span>
            <span className={s.actionDetail}>Images, text and other files</span>
          </span>
        </button>
        {selection && selectionAttachment ? (
          <button
            className={s.action}
            role="menuitem"
            type="button"
            onClick={() => {
              close()
              insertOptions([selection])
            }}
          >
            <span aria-hidden="true" className={s.actionIcon}>
              <TextSelectIcon />
            </span>
            <span className={s.actionText}>
              <span className={s.actionTitle}>Selected text</span>
              <span className={s.actionDetail}>
                “{selectionAttachment.content.slice(0, 40)}” on{" "}
                {getHost(selectionAttachment.url)}
              </span>
            </span>
          </button>
        ) : null}

        {tabs.length > 0 ? (
          <>
            <div className={s.sectionLabel}>
              <span>Open tabs</span>
              <span className={s.sectionHint}>
                Content is extracted on send
              </span>
            </div>
            <div className={s.tabs} role="group">
              {tabs.map((option) => {
                const page = option.attachment as Pick<
                  PageContent,
                  "id" | "title" | "url"
                >

                return (
                  <label key={option.key} className={s.tab}>
                    <Checkbox
                      checked={selectedKeys.includes(option.key)}
                      data-testid="attach-menu-tab"
                      onChange={(event) =>
                        setSelectedKeys((keys) =>
                          event.target.checked
                            ? [...keys, option.key]
                            : keys.filter((key) => key !== option.key),
                        )
                      }
                    />
                    <GlobeIcon aria-hidden="true" className={s.tabIcon} />
                    <span className={s.tabText}>
                      <span className={s.tabTitle}>
                        {page.title || page.url}
                      </span>
                      <span className={s.tabHost}>{getHost(page.url)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className={s.footer}>
              <span className={s.count}>
                {selectedKeys.length === 1
                  ? "1 tab selected"
                  : `${selectedKeys.length} tabs selected`}
              </span>
              <Button
                data-testid="attach-menu-attach-tabs"
                disabled={selectedKeys.length === 0}
                size="small"
                onClick={() => {
                  close()
                  insertOptions(
                    tabs.filter((option) => selectedKeys.includes(option.key)),
                  )
                }}
              >
                {getAttachTabsLabel(selectedKeys.length)}
              </Button>
            </div>
          </>
        ) : null}
      </Popover>
    </>
  )
}
