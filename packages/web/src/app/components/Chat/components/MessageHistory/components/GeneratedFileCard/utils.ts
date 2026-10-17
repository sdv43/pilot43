import type { GeneratedFile } from "@pilot43/protocol"

/** Divisor used to convert a character count into kilobytes. */
export const bytesPerKilobyte = 1024

/**
 * Formats a file size in characters as a kilobyte string for tooltips,
 * e.g. `1.4 KB`. Uses 1024-based units and keeps one decimal place only
 * when the value is below 10 KB.
 */
export function formatFileSizeInKilobytes(size: number): string {
  const kilobytes = size / bytesPerKilobyte

  if (kilobytes < 1) {
    return `${size} B`
  }

  if (kilobytes < 10) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${Math.round(kilobytes)} KB`
}

/**
 * Triggers a browser download of a generated file using a blob object URL.
 * The anchor element is never attached to the DOM and the URL is always
 * revoked afterwards so the blob can be garbage collected.
 */
export function downloadGeneratedFile(
  file: GeneratedFile,
  mimeType: string,
): boolean {
  try {
    const blob = new Blob([file.content], { type: file.mimeType || mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = file.filename
    anchor.click()
    URL.revokeObjectURL(url)

    return true
  } catch {
    return false
  }
}

const typeLabels: Record<string, string> = {
  css: "CSS",
  csv: "CSV",
  html: "HTML",
  js: "JavaScript",
  json: "JSON",
  md: "Markdown",
  py: "Python",
  svg: "SVG",
  ts: "TypeScript",
  txt: "Text",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
}

/** `Markdown · 4.2 KB`. */
export function describeGeneratedFile(filename: string, size: number) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? ""

  return `${typeLabels[extension] ?? "File"} · ${formatFileSizeInKilobytes(size)}`
}
