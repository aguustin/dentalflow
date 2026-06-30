import { RequestUser } from '../types/request-user.type';

/**
 * Immutable per-request context carrying the authenticated tenant identity
 * and a unique request ID for correlated logging.
 *
 * Created from the validated JWT payload — never from unverified input.
 */
export class TenantContext {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly roleId: string,
    public readonly requestId: string,
  ) {}

  static from(user: RequestUser, requestId: string): TenantContext {
    return new TenantContext(user.organizationId, user.userId, user.roleId, requestId);
  }
}
