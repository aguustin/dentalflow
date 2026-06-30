import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { asyncContext } from '../context/async-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const eventChainId = randomUUID();

    (req as any)['requestId'] = requestId;
    (req as any)['eventChainId'] = eventChainId;
    res.setHeader('X-Request-ID', requestId);

    // Run the rest of the request inside the async context so that
    // any DomainEvent constructed during this request automatically
    // picks up eventChainId from asyncContext.getStore().
    asyncContext.run({ requestId, eventChainId }, next);
  }
}
