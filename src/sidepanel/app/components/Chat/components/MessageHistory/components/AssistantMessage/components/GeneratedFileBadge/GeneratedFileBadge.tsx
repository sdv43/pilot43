import { FileTextIcon } from "lucide-react"

import { Badge, toast } from "@/sidepanel/app/components"
import { useApiClient } from "@/sidepanel/app/components/ApiClientProvider/context"
import { cn } from "@/sidepanel/shared/cn"

import type { GeneratedFileBadgeProps } from "./types"

import s from "./GeneratedFileBadge.module.css"
import { downloadGeneratedFile, formatFileSizeInKilobytes } from "./utils"

export function GeneratedFileBadge({
  fileId,
  filename,
  mimeType,
  size,
  className,
}: GeneratedFileBadgeProps) {
  const apiClient = useApiClient()
  const icon = <FileTextIcon size={12} />

  const handleClick = async () => {
    try {
      const file = await apiClient.generatedFileGet(fileId)
      const downloaded = downloadGeneratedFile(file, mimeType)

      toast(
        downloaded
          ? `Downloaded ${filename}`
          : `Failed to download ${filename}`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to download ${filename}`
      toast(message)
    }
  }

  return (
    <Badge
      aria-label={`Download ${filename}`}
      as="button"
      className={cn(s.generatedFileBadge, className)}
      data-testid="generated-file-badge"
      icon={icon}
      title={`Download ${filename} (${formatFileSizeInKilobytes(size)})`}
      type="button"
      variant="default"
      onClick={() => void handleClick()}
    >
      {filename}
    </Badge>
  )
}
