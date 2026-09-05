import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  appendToGeneratedFile,
  createGeneratedFile,
} from "@/offscreen/storage/generated-file-store"

vi.mock("@/offscreen/storage/generated-file-store", () => ({
  appendToGeneratedFile: vi.fn(),
  createGeneratedFile: vi.fn(),
}))

import { executeGenerateFileTool } from "./generate-file"
import { sanitizeGeneratedFilename } from "./utils"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createGeneratedFile).mockImplementation((file) =>
    Promise.resolve(file),
  )
})

describe("sanitizeGeneratedFilename", () => {
  it("keeps a plain name with an allowed extension", () => {
    expect(sanitizeGeneratedFilename("report.md")).toBe("report.md")
    expect(sanitizeGeneratedFilename("data.CSV")).toBe("data.CSV")
  })

  it("strips path separators and traversal fragments", () => {
    expect(sanitizeGeneratedFilename("../etc/passwd.txt")).toBe("etcpasswd.txt")
    expect(sanitizeGeneratedFilename("docs\\notes.txt")).toBe("docsnotes.txt")
  })

  it("falls back to generated.txt for unknown extensions or empty input", () => {
    expect(sanitizeGeneratedFilename("archive.zip")).toBe("generated.txt")
    expect(sanitizeGeneratedFilename("report")).toBe("generated.txt")
    expect(sanitizeGeneratedFilename("   ")).toBe("generated.txt")
  })

  it("truncates names longer than 100 characters", () => {
    const longName = `${"a".repeat(120)}.md`
    const sanitized = sanitizeGeneratedFilename(longName)
    expect(sanitized.length).toBeLessThanOrEqual(100)
  })
})

describe("executeGenerateFileTool", () => {
  it("creates a file and returns compact metadata", async () => {
    const result = await executeGenerateFileTool(
      { content: "# Hello\nworld", filename: "report.md" },
      "chat-1",
    )

    expect(createGeneratedFile).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "chat-1",
        content: "# Hello\nworld",
        filename: "report.md",
        mimeType: "text/markdown",
      }),
    )

    expect(result).toMatchObject({
      filename: "report.md",
      lines: 2,
      mimeType: "text/markdown",
      ok: true,
      size: 13,
    })
    expect(result).not.toHaveProperty("content")
  })

  it("requires a non-empty content string", async () => {
    await expect(
      executeGenerateFileTool({ filename: "a.txt" }, "chat-1"),
    ).rejects.toThrow("must be a string")
  })

  it("rejects a chunk larger than the limit", async () => {
    await expect(
      executeGenerateFileTool(
        { content: "a".repeat(200001), filename: "big.txt" },
        "chat-1",
      ),
    ).rejects.toThrow("exceeds 200000 characters")
  })

  it("appends a chunk to an existing file", async () => {
    vi.mocked(appendToGeneratedFile).mockResolvedValue({
      chatId: "chat-1",
      content: "onetwo",
      createdAt: 1,
      filename: "report.md",
      id: "file-1",
      mimeType: "text/markdown",
      size: 6,
      updatedAt: 2,
    })

    const result = await executeGenerateFileTool(
      {
        content: "two",
        file_id: "file-1",
        filename: "report.md",
        mode: "append",
      },
      "chat-1",
    )

    expect(appendToGeneratedFile).toHaveBeenCalledWith("file-1", "two")
    expect(result).toMatchObject({ fileId: "file-1", ok: true, size: 6 })
  })

  it("requires file_id when mode is append", async () => {
    await expect(
      executeGenerateFileTool(
        { content: "two", filename: "report.md", mode: "append" },
        "chat-1",
      ),
    ).rejects.toThrow("`file_id`")
  })
})
