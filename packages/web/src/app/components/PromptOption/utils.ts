/** Splits `text` around the first case-insensitive match of `query`. */
export function splitHighlight(text: string, query: string | undefined) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1

  if (!query || index < 0) {
    return { after: "", before: text, match: "" }
  }

  return {
    after: text.slice(index + query.length),
    before: text.slice(0, index),
    match: text.slice(index, index + query.length),
  }
}
