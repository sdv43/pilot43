import { describe, expect, it } from "vitest"

import {
  createFileCommandOptions,
  insertCommandOptionsAtSelection,
} from "./utils"

describe("createFileCommandOptions", () => {
  it("sanitizes special characters and truncates long file commands", async () => {
    const [option] = await createFileCommandOptions(
      [
        {
          name: "very long file name with spaces and symbols!.txt",
          size: 4,
          type: "text/plain",
          text: () => Promise.resolve("body"),
        } as File,
      ],
      [],
    )

    expect(option.command).toMatch(/^file:/)
    expect(option.command.length).toBeLessThanOrEqual(30)
    expect(option.command).toContain("...")
    expect(option.command).not.toMatch(/[\s!]/)
    expect(option.attachment).toMatchObject({
      content: "body",
      mediaType: "text/plain",
      name: "very long file name with spaces and symbols!.txt",
      type: "file",
    })
  })
})

describe("insertCommandOptionsAtSelection", () => {
  it("inserts commands in the middle of the text and keeps spaces around them", () => {
    expect(
      insertCommandOptionsAtSelection(
        "HelloWorld",
        [{ command: "file:note.txt", type: "hash" }],
        5,
        5,
      ),
    ).toEqual({
      nextSelection: 21,
      nextText: "Hello #file:note.txt World",
    })
  })

  it("appends commands to the end of the text", () => {
    expect(
      insertCommandOptionsAtSelection(
        "Hello",
        [{ command: "file:note.txt", type: "hash" }],
        5,
        5,
      ),
    ).toEqual({
      nextSelection: 21,
      nextText: "Hello #file:note.txt ",
    })
  })
})
