import { ForwardIcon, PaperclipIcon, SquareIcon } from "lucide-react"
import { type ChangeEvent, useRef } from "react"

import { cn } from "../../../../../shared/cn"
import { IconButton } from "../../../IconButton"
import { useHandleFilesAttached } from "../../hooks/useHandleFilesAttached"
import { useSendMessage } from "../../hooks/useSendMessage"
import { useStopMessageRun } from "../../hooks/useStopMessageRun"
import s from "./BottomBar.module.css"
import { ChatSettings } from "./components/ChatSettings"
import { ModelSelector } from "./components/ModelSelector"
import { TokenEstimation } from "./components/TokenEstimation"
import { type BottomBarProps } from "./types"

export function BottomBar({
  className,
  textareaRef,
  ...props
}: BottomBarProps) {
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
    <div {...props} className={cn(s.container, className)}>
      <ModelSelector />
      <TokenEstimation className={s.toleft} />
      <span className={s.devider} />
      <IconButton
        aria-label="Attach files"
        data-testid="message-editor-attach-button"
        icon={<PaperclipIcon size={14} />}
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
      />
      <ChatSettings />
      <span className={s.devider} />
      {shouldShowStopButton ? (
        <IconButton
          aria-label="Stop generating"
          data-testid="message-editor-stop-button"
          disabled={isStopPending}
          icon={<SquareIcon size={14} />}
          variant="secondary"
          onClick={stopMessageRun}
        />
      ) : (
        <IconButton
          aria-label="Send message"
          disabled={isSendDisabled}
          icon={<ForwardIcon size={14} />}
          variant="secondary"
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
