export interface MessageFormat<T = unknown, A = unknown, P = unknown> {
  target: T
  action: A
  payload: P
}

export interface MessageResponseFormat<R = unknown, E extends string = string> {
  result: R
  error?: E
}
