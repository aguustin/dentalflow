/**
 * Base class for errors originating in the domain layer.
 *
 * Domain errors are pure TypeScript — they carry NO dependency on NestJS,
 * HTTP status codes, or any framework. The HTTP layer maps them to HTTP
 * exceptions via HttpErrorMapper.
 *
 * Error code conventions:
 *   NOT_FOUND     — An aggregate or entity could not be located
 *   CONFLICT      — A uniqueness or business invariant was violated
 *   INVALID       — Input or state failed domain validation
 *   FORBIDDEN     — A domain-level authorization rule was violated
 *   UNAVAILABLE   — A required resource is temporarily unavailable
 */
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID'
  | 'FORBIDDEN'
  | 'UNAVAILABLE';
