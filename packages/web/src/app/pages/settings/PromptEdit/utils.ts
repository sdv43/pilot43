/** Helper under the title field: how to find the prompt in the `/` menu. */
export function getTitleHelper(title: string) {
  const query = title.trim().split(/\s+/)[0]?.slice(0, 3).toLowerCase()

  return query
    ? `Shown in the / menu — type “/${query}” to find it`
    : "Shown in the / menu"
}
