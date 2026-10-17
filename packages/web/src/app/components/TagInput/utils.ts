/** Adds a trimmed tag unless it is empty or already present. */
export function addTag(tags: string[], value: string) {
  const tag = value.trim()

  return tag && !tags.includes(tag) ? [...tags, tag] : tags
}
