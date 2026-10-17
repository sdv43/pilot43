import { Dialog } from "../../../../components/Dialog"
import { RenameChatForm } from "./components/RenameChatForm"
import { type RenameChatDialogProps } from "./types"

export function RenameChatDialog({ chat, onClose }: RenameChatDialogProps) {
  return (
    <Dialog
      open={!!chat}
      title="Rename chat"
      onOpenChange={(open) => !open && onClose()}
    >
      {chat ? <RenameChatForm chat={chat} onClose={onClose} /> : null}
    </Dialog>
  )
}
