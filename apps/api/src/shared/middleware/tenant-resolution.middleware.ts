import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolutionMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
          if (payload.organizationId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any)['organizationId'] = payload.organizationId;
            this.logger.debug(`Tenant resolved: ${payload.organizationId}`);
          }
        }
      } catch {
        // Malformed tokens are rejected later by the JWT guard — not our concern here
      }
    }

    next();
  }
}
