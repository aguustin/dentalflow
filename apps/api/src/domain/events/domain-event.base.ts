import { randomUUID } from 'crypto';
import { getRequestContext } from '../../shared/context/async-context';

/**
 * Base class for all domain events.
 *
 * Contract fields (outbox-ready):
 *   - id            unique event identifier
 *   - type          event name, used by the event bus for routing
 *   - timestamp     wall-clock time of emission
 *   - organizationId  tenant scope ('' for system-level events)
 *   - eventChainId  links all events emitted in the same HTTP request;
 *                   auto-populated from AsyncLocalStorage when available
 *   - payload       typed event data
 */
export abstract class DomainEvent<P extends object = object> {
  public readonly id: string;
  public readonly type: string;
  public readonly timestamp: Date;
  public readonly organizationId: string;
  public readonly eventChainId: string;
  public readonly payload: P;

  protected constructor(type: string, organizationId: string, payload: P) {
    this.id = randomUUID();
    this.type = type;
    this.timestamp = new Date();
    this.organizationId = organizationId;
    // Inherit chain from the active request context; generate a new one for
    // out-of-request emission (e.g. background jobs, seeder).
    this.eventChainId = getRequestContext()?.eventChainId ?? randomUUID();
    this.payload = payload;
  }

  get eventName(): string {
    return this.type;
  }
}
