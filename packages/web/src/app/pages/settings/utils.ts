/** `1 chat`, `3 chats`. */
export function formatCount(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}
