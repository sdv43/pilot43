import { describe, expect, it } from "vitest"

import {
  getBase64ByteLength,
  getToolResultImages,
  replaceToolResultImages,
} from "./tool-result-images"

const png = { data: "iVBORw0KGgo=", mimeType: "image/png" }

describe("getToolResultImages", () => {
  it("returns valid images with supported types only", () => {
    expect(
      getToolResultImages({
        images: [
          png,
          { data: "AAAA", mimeType: "image/tiff" },
          { data: "", mimeType: "image/png" },
          "not an image",
        ],
      }),
    ).toEqual([png])
  })

  it("returns no images when the field is missing or not a list", () => {
    expect(getToolResultImages(null)).toEqual([])
    expect(getToolResultImages({ ok: true })).toEqual([])
    expect(getToolResultImages({ images: "2 images" })).toEqual([])
  })
})

describe("replaceToolResultImages", () => {
  it("replaces the images and keeps the other fields", () => {
    expect(
      replaceToolResultImages(
        { images: [png], ok: true },
        (images) => `${images.length} image`,
      ),
    ).toEqual({ images: "1 image", ok: true })
  })

  it("returns results without images unchanged", () => {
    const result = { ok: true }

    expect(replaceToolResultImages(result, () => "x")).toBe(result)
  })
})

describe("getBase64ByteLength", () => {
  it("accounts for padding", () => {
    expect(getBase64ByteLength("AAAA")).toBe(3)
    expect(getBase64ByteLength("AAA=")).toBe(2)
    expect(getBase64ByteLength("AA==")).toBe(1)
    expect(getBase64ByteLength("")).toBe(0)
  })
})
