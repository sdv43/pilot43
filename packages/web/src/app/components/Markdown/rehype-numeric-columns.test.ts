import { describe, expect, it } from "vitest"

import { rehypeNumericColumns } from "./utils"

const cell = (tagName: "td" | "th", value: string, align?: string) => ({
  children: [{ type: "text", value }],
  properties: align ? { align } : {},
  tagName,
  type: "element",
})

const row = (...children: ReturnType<typeof cell>[]) => ({
  children,
  tagName: "tr",
  type: "element",
})

describe("rehypeNumericColumns", () => {
  it("marks columns where every body cell is a number", () => {
    const table = {
      children: [
        row(
          cell("th", "Week"),
          cell("th", "Free"),
          cell("th", "Share", "left"),
        ),
        row(cell("td", "Oct 27"), cell("td", "1,204"), cell("td", "12%")),
        row(cell("td", "Nov 3"), cell("td", "$1.3k"), cell("td", "14 %")),
      ],
      tagName: "table",
      type: "element",
    }

    rehypeNumericColumns()({ children: [table], type: "root" })

    const flags = table.children.map((tr) =>
      tr.children.map(
        (c) => (c.properties as Record<string, unknown>).dataNumeric ?? null,
      ),
    )

    expect(flags).toEqual([
      [null, "true", null],
      [null, "true", "true"],
      [null, "true", "true"],
    ])
  })
})
