import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DomainError } from './domain.error';
import { ApplicationError } from './application.error';

/**
 * Maps framework-agnostic DomainError and ApplicationError to NestJS
 * HttpException subclasses. This is the ONLY place in the platform that
 * is allowed to translate business errors into HTTP semantics.
 *
 * The transformation pipeline is:
 *   Domain layer    → throws DomainError
 *   Application layer → catches or re-throws as ApplicationError
 *   DomainExceptionFilter → calls HttpErrorMapper → returns HttpException
 *   NestJS          → serializes to HTTP response
 */
export class HttpErrorMapper {
  static fromDomainError(err: DomainError): HttpException {
    switch (err.code) {
      case 'NOT_FOUND':
        return new NotFoundException(err.message);
      case 'CONFLICT':
        return new ConflictException(err.message);
      case 'INVALID':
        return new UnprocessableEntityException(err.message);
      case 'FORBIDDEN':
        return new ForbiddenException(err.message);
      case 'UNAVAILABLE':
        return new ServiceUnavailableException(err.message);
      default:
        return new BadRequestException(err.message);
    }
  }

  static fromApplicationError(err: ApplicationError): HttpException {
    switch (err.code) {
      case 'RESOURCE_NOT_FOUND':
        return new NotFoundException(err.message);
      case 'OPERATION_NOT_ALLOWED':
        return new ForbiddenException(err.message);
      case 'VALIDATION_FAILED':
        return new UnprocessableEntityException(err.message);
      case 'PRECONDITION_FAILED':
        return new BadRequestException(err.message);
      case 'EXTERNAL_DEPENDENCY_FAILED':
        return new ServiceUnavailableException(err.message);
      default:
        return new BadRequestException(err.message);
    }
  }
}
