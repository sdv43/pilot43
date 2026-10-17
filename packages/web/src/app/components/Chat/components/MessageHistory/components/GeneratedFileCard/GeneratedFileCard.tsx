import { DownloadIcon, FileTextIcon } from "lucide-react"

import { useApiClient } from "../../../../../ApiClientProvider/context"
import { IconButton } from "../../../../../IconButton"
import { toast } from "../../../../../ToastProvider"
import s from "./GeneratedFileCard.module.css"
import { type GeneratedFileCardProps } from "./types"
import { describeGeneratedFile, downloadGeneratedFile } from "./utils"

/** A file created by the `generate_file` tool, downloadable from the chat. */
export function GeneratedFileCard({
  fileId,
  filename,
  mimeType,
  size,
}: GeneratedFileCardProps) {
  const apiClient = useApiClient()

  async function download() {
    try {
      const file = await apiClient.generatedFileGet(fileId)

      toast(
        downloadGeneratedFile(file, mimeType)
          ? `Downloaded ${filename}`
          : `Failed to download ${filename}`,
      )
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : `Failed to download ${filename}`,
      )
    }
  }

  return (
    <div className={s.generatedFileCard} data-testid="generated-file-card">
      <span aria-hidden="true" className={s.icon}>
        <FileTextIcon />
      </span>
      <span className={s.text}>
        <span className={s.name}>{filename}</span>
        <span className={s.meta}>{describeGeneratedFile(filename, size)}</span>
      </span>
      <IconButton
        aria-label={`Download ${filename}`}
        data-testid="generated-file-badge"
        icon={<DownloadIcon />}
        size="small"
        title="Download"
        onClick={() => void download()}
      />
    </div>
  )
}
