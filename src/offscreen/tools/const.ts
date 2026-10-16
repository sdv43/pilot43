export const defaultFetchTimeoutMs = 10000
export const maxFetchResponseCharacters = 50000
export const maxReadabilityContentCharacters = 30000
export const maxReadabilityTextCharacters = 30000
export const defaultRunJsTimeoutMs = 5000
export const maxRunJsTimeoutMs = 30000
export const minRunJsTimeoutMs = 100

/** Max characters accepted by a single `generate_file` call. */
export const maxGeneratedFileChunkCharacters = 200000
/** Max total characters a generated file may reach through append calls. */
export const maxGeneratedFileTotalCharacters = 1000000
/** Max characters of the filename, including the extension. */
export const maxGeneratedFileFilenameLength = 100
/** Characters of the file content kept in the tool result as a preview. */
export const generatedFilePreviewCharacters = 200
export const maxMcpResourceCharacters = 50000
export const maxMcpResourcePages = 5
export const maxMcpResourcesListed = 200
export const listMcpResourcesToolName = "list_mcp_resources"
export const readMcpResourceToolName = "read_mcp_resource"

export const sandboxFrameId = "pilot43-run-js-sandbox"
export const sandboxPagePath = "sandbox.html"
export const sandboxResponseTimeoutPaddingMs = 1000
export const sandboxRequestType = "pilot43:run-js-request"
export const sandboxResponseType = "pilot43:run-js-response"
export const sandboxWorkerRequestType = "pilot43:run-js-worker-request"
export const sandboxWorkerResponseType = "pilot43:run-js-worker-response"
export const maxArrayEntries = 200
export const maxConsoleEntries = 200
export const maxObjectEntries = 200
export const maxStringLength = 8000
