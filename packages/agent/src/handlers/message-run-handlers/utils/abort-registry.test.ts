import { describe, expect, it } from "vitest"

import {
  abortMessageRun,
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry"

describe("registerAbortController", () => {
  it("registers a controller for the given run id and exposes its signal", () => {
    const controller = new AbortController()

    const signal = registerAbortController("run-1", controller)

    expect(signal).toBe(controller.signal)
    expect(signal.aborted).toBe(false)
  })

  it("replaces a previously registered controller for the same run id", () => {
    const firstController = new AbortController()
    const secondController = new AbortController()

    registerAbortController("run-2", firstController)
    registerAbortController("run-2", secondController)

    expect(abortMessageRun("run-2")).toBe(true)
    expect(secondController.signal.aborted).toBe(true)
    expect(firstController.signal.aborted).toBe(false)
  })
})

describe("abortMessageRun", () => {
  it("aborts the registered controller and removes it from the registry", () => {
    const controller = new AbortController()

    registerAbortController("run-3", controller)

    expect(abortMessageRun("run-3")).toBe(true)
    expect(controller.signal.aborted).toBe(true)
    expect(abortMessageRun("run-3")).toBe(false)
  })

  it("returns false when no controller is registered for the given id", () => {
    expect(abortMessageRun("missing-run")).toBe(false)
  })
})

describe("unregisterAbortController", () => {
  it("removes a registered controller without aborting it", () => {
    const controller = new AbortController()

    registerAbortController("run-4", controller)
    unregisterAbortController("run-4")

    expect(abortMessageRun("run-4")).toBe(false)
    expect(controller.signal.aborted).toBe(false)
  })
})
