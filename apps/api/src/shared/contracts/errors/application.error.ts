/**
 * Base class for errors originating in the application (use-case) layer.
 *
 * Application errors express coordination failures: validation across
 * multiple aggregates, external service unavailability, precondition
 * failures that span domain boundaries. They carry NO HTTP dependency.
 *
 * New use cases SHOULD throw ApplicationError (or DomainError via domain
 * objects) rather than throwing NestJS HttpException directly, so that
 * the mapping to HTTP status codes stays in one place (HttpErrorMapper /
 * DomainExceptionFilter).
 */
export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ApplicationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type ApplicationErrorCode =
  | 'VALIDATION_FAILED'
  | 'PRECONDITION_FAILED'
  | 'EXTERNAL_DEPENDENCY_FAILED'
  | 'OPERATION_NOT_ALLOWED'
  | 'RESOURCE_NOT_FOUND';
