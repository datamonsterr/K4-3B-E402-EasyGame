export type ToolOperationErrorKind =
  "unavailable" | "forbidden" | "conflict" | "invalid";

export class ToolOperationError extends Error {
  readonly name = "ToolOperationError";

  constructor(
    readonly operation: string,
    readonly kind: ToolOperationErrorKind,
  ) {
    super(`${operation} failed`);
  }
}
