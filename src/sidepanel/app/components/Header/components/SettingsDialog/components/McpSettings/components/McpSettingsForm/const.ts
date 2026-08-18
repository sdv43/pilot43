export const autosaveDelayMs = 1000

/**
 * Example MCP servers document shown in the "how to" popover above the editor.
 */
export const mcpServersExample = `{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    },
    "database": {
      "type": "http",
      "url": "https://mcp.example.com/db"
    }
  }
}`

/**
 * JSON Schema describing the expected shape of the MCP servers document. Used
 * by the JSON editor for inline validation. Only the HTTP transport is
 * supported. The document is an object with a `servers` map keyed by server
 * name. Each value points at the endpoint (`url`) and may include extra
 * transport configuration such as `headers`.
 */
export const mcpServersSchema = {
  type: "object",
  properties: {
    servers: {
      type: "object",
      description:
        "Map of MCP servers keyed by unique name. Each value contains the transport config and optional extra settings such as headers.",
      additionalProperties: {
        type: "object",
        description: "A single MCP server configuration.",
        properties: {
          type: {
            type: "string",
            enum: ["http"],
            description: 'Transport type. Only "http" is supported.',
          },
          url: {
            type: "string",
            minLength: 1,
            description: "Absolute http(s) URL of the server's endpoint.",
          },
          headers: {
            type: "object",
            description:
              "Optional HTTP headers sent with every request to the server.",
            additionalProperties: {
              type: "string",
            },
          },
        },
        required: ["type", "url"],
        additionalProperties: true,
      },
    },
  },
  required: ["servers"],
  additionalProperties: false,
}
