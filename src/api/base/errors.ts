/**
 * ApiError — the error contract shared across the API layer.
 *
 * Every failed request (regardless of transport) rejects with an ApiError that
 * carries the HTTP `status`, the parsed response `data`, and a human-readable
 * `message`. Pages rely on `err instanceof ApiError && err.status === 403` to
 * distinguish permission failures, so this shape must stay stable.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
