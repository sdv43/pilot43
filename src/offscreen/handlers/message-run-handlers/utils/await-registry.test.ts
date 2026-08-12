import { describe, expect, it } from "vitest"

import {
  rejectMessageRunAnswer,
  resolveMessageRunAnswer,
  waitForMessageRunAnswer,
} from "./await-registry"

describe("waitForMessageRunAnswer", () => {
  it("returns a promise that can be resolved later", async () => {
    const pending = waitForMessageRunAnswer("run-1")

    expect(resolveMessageRunAnswer("run-1", "yes")).toBe(true)
    await expect(pending).resolves.toBe("yes")
  })

  it("returns false when no pending answer is registered", () => {
    expect(resolveMessageRunAnswer("missing-run", "answer")).toBe(false)
  })
})

describe("rejectMessageRunAnswer", () => {
  it("rejects the pending answer promise for the given run id", async () => {
    const pending = waitForMessageRunAnswer("run-2")
    const error = new Error("stopped")

    expect(rejectMessageRunAnswer("run-2", error)).toBe(true)
    await expect(pending).rejects.toThrow("stopped")
  })

  it("returns false when no pending answer is registered", () => {
    expect(rejectMessageRunAnswer("missing-run", new Error("missing"))).toBe(
      false,
    )
  })
})
