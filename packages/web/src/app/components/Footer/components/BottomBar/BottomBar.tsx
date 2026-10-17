import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { type ChangeEvent, useRef } from "react"

import { cn } from "../../../../../shared/cn"
import { IconButton } from "../../../IconButton"
import { useHandleFilesAttached } from "../../hooks/useHandleFilesAttached"
import { useSendMessage } from "../../hooks/useSendMessage"
import { useStopMessageRun } from "../../hooks/useStopMessageRun"
import s from "./BottomBar.module.css"
import { AttachMenu } from "./components/AttachMenu"
import { ChatSettings } from "./components/ChatSettings"
import { ModelSelector } from "./components/ModelSelector"
import { type BottomBarProps } from "./types"

/** Composer toolbar: attach, model, tools and send/stop. */
export function BottomBar({ className, textareaRef }: BottomBarProps) {
  const { isSendDisabled, sendMessage } = useSendMessage()
  const { isStopPending, shouldShowStopButton, stopMessageRun } =
    useStopMessageRun()
  const { handleFilesAttached } = useHandleFilesAttached(textareaRef)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])

    event.currentTarget.value = ""
    void handleFilesAttached(files)
  }

  return (
    <div className={cn(s.bottomBar, className)}>
      <AttachMenu
        textareaRef={textareaRef}
        onUploadFiles={() => fileInputRef.current?.click()}
      />
      <ModelSelector />
      <ChatSettings />
      <span className={s.spacer} />
      {shouldShowStopButton ? (
        <IconButton
          aria-label="Stop generating"
          data-testid="message-editor-stop-button"
          disabled={isStopPending}
          icon={<SquareIcon className={s.stopIcon} />}
          size="small"
          title="Stop (Esc)"
          variant="subtle"
          onClick={stopMessageRun}
        />
      ) : (
        <IconButton
          aria-label="Send message"
          data-testid="message-editor-send-button"
          disabled={isSendDisabled}
          icon={<ArrowUpIcon />}
          size="small"
          title="Send (Enter)"
          variant="accent"
          onClick={sendMessage}
        />
      )}

      <input
        ref={fileInputRef}
        multiple
        className={s.fileInput}
        data-testid="message-editor-file-input"
        type="file"
        onChange={handleFileInputChange}
      />
    </div>
  )
}
