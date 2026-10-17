export const defaultFetchTimeoutMs = 10000
export const maxFetchResponseCharacters = 50000

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
