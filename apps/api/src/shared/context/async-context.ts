import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestAsyncContext {
  requestId: string;
  eventChainId: string;
}

export const asyncContext = new AsyncLocalStorage<RequestAsyncContext>();

export function getRequestContext(): RequestAsyncContext | undefined {
  return asyncContext.getStore();
}

export function newRequestContext(requestId?: string): RequestAsyncContext {
  return {
    requestId: requestId ?? randomUUID(),
    eventChainId: randomUUID(),
  };
}
