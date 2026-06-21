export const autosaveDelayMs = 1000

/**
 * JSON Schema describing the expected shape of the MCP servers document. Used
 * by the JSON editor for inline validation. Only the HTTP transport is
 * supported. The document is an object with a `servers` map keyed by server
 * name.
 */
export const mcpServersSchema = {
  type: "object",
  properties: {
    servers: {
      type: "object",
      description: "Map of MCP servers keyed by unique name.",
      additionalProperties: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["http"],
            description: 'Transport type. Only "http" is supported.',
          },
          url: {
            type: "string",
            description: "Absolute http(s) URL of the MCP server endpoint.",
          },
          headers: {
            type: "object",
            description: "Optional HTTP headers sent with every request.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["type", "url"],
        additionalProperties: false,
      },
    },
  },
  required: ["servers"],
  additionalProperties: false,
}
