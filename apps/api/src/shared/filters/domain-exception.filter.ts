import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../contracts/errors/domain.error';
import { ApplicationError } from '../contracts/errors/application.error';
import { HttpErrorMapper } from '../contracts/errors/http-error.mapper';
import { getRequestContext } from '../context/async-context';

/**
 * Global exception filter that catches DomainError and ApplicationError,
 * maps them to the appropriate HTTP response via HttpErrorMapper, and
 * emits a structured log entry with the full observability context.
 *
 * Registration: { provide: APP_FILTER, useClass: DomainExceptionFilter }
 *   in AppModule providers (registered BEFORE the built-in filters).
 */
@Catch(DomainError, ApplicationError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError | ApplicationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const httpException =
      exception instanceof DomainError
        ? HttpErrorMapper.fromDomainError(exception)
        : HttpErrorMapper.fromApplicationError(exception);

    const status = httpException.getStatus();
    const body = httpException.getResponse();

    const { requestId, eventChainId } = getRequestContext() ?? {
      requestId: (request as any)['requestId'] ?? 'no-id',
      eventChainId: 'no-chain',
    };

    this.logger.warn(
      JSON.stringify({
        requestId,
        eventChainId,
        errorName: exception.name,
        errorCode: exception.code,
        message: exception.message,
        statusCode: status,
      }),
    );

    response.status(status).json(
      typeof body === 'string'
        ? { statusCode: status, message: body, error: exception.name }
        : body,
    );
  }
}
