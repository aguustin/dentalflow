import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../context/tenant-context';
import { RequestUser } from '../types/request-user.type';

/**
 * Parameter decorator that extracts a TenantContext from the current request.
 * Only valid on authenticated (non-@Public) endpoints.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) throw new UnauthorizedException('No authenticated user in request');
    const requestId: string = (request as any)['requestId'] ?? 'no-id';
    return TenantContext.from(user, requestId);
  },
);
