import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingGuardService } from '../../application/services/billing-guard.service';
import { RequestUser } from '../../../../shared/types/request-user.type';

// Metadata key for opting out of billing checks on specific routes
export const SKIP_BILLING_KEY = 'skipBilling';

const BILLING_FEATURE_MAP: Record<string, string> = {
  '/customers': 'customers',
  '/appointments': 'appointments',
};

const BILLING_METRIC_MAP: Record<string, 'customers' | 'appointments'> = {
  customers: 'customers',
  appointments: 'appointments',
};

function resolveFeatureFromPath(path: string): string | null {
  for (const [prefix, feature] of Object.entries(BILLING_FEATURE_MAP)) {
    if (path.includes(prefix)) return feature;
  }
  return null;
}

@Injectable()
export class BillingGuard implements CanActivate {
  private readonly logger = new Logger(BillingGuard.name);

  constructor(
    private readonly billingGuardService: BillingGuardService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if route opted out
    const skipBilling = this.reflector.getAllAndOverride<boolean>(SKIP_BILLING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipBilling) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    // No user = not authenticated; let the JWT guard handle it
    if (!user) return true;

    const path: string = request.path ?? '';
    const feature = resolveFeatureFromPath(path);

    // Route not under a gated feature — billing check not applicable
    if (!feature) return true;

    // Only check usage limits on POST (create) requests
    const isWriteOperation = request.method === 'POST';
    const metric = isWriteOperation ? BILLING_METRIC_MAP[feature] : undefined;

    const result = await this.billingGuardService.checkAccess(
      user.organizationId,
      feature,
      metric,
    );

    if (!result.allowed) {
      this.logger.warn(
        `Billing block org=${user.organizationId} feature=${feature} reason=${result.reason}: ${result.detail}`,
      );

      if (result.reason === 'NO_ACTIVE_SUBSCRIPTION') {
        throw new HttpException(
          result.detail ?? 'Active subscription required',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      throw new ForbiddenException(result.detail ?? `Feature '${feature}' not available`);
    }

    return true;
  }
}
