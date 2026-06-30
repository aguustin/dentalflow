import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestUser } from '../types/request-user.type';
import { getRequestContext } from '../context/async-context';

interface AuditLog {
  requestId: string;
  eventChainId: string;
  userId: string | null;
  organizationId: string | null;
  action: string;
  durationMs: number;
  statusCode?: number;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user: RequestUser | undefined = request.user;
    const start = Date.now();

    const action = `${request.method} ${request.url}`;

    return next.handle().pipe(
      tap(() => {
        // Prefer AsyncLocalStorage (set by RequestIdMiddleware); fall back to
        // request properties for paths that bypass the middleware stack.
        const asyncCtx = getRequestContext();
        const requestId = asyncCtx?.requestId ?? (request as any)['requestId'] ?? 'no-id';
        const eventChainId = asyncCtx?.eventChainId ?? (request as any)['eventChainId'] ?? 'no-chain';

        const log: AuditLog = {
          requestId,
          eventChainId,
          userId: user?.userId ?? null,
          organizationId: user?.organizationId ?? null,
          action,
          durationMs: Date.now() - start,
          statusCode: response.statusCode,
        };
        this.logger.log(JSON.stringify(log));
      }),
    );
  }
}
