import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../domain/events/domain-event.base';
import { IEventBus, IEventHandler } from '../../shared/types/event-bus.interface';

@Injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers = new Map<string, IEventHandler<DomainEvent>[]>();

  subscribe<T extends DomainEvent>(eventName: string, handler: IEventHandler<T>): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler as IEventHandler<DomainEvent>]);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName) ?? [];

    // eventChainId propagates from the request context through DomainEvent.
    // Log it here so event-bus logs can be correlated with audit logs.
    this.logger.debug(
      `[chain:${event.eventChainId}] ${event.type} id=${event.id} org=${event.organizationId || 'system'} handlers=${eventHandlers.length}`,
    );

    await Promise.all(
      eventHandlers.map((handler) =>
        handler.handle(event).catch((err) => {
          this.logger.error(
            `[chain:${event.eventChainId}] Handler failed for ${event.type}: ${err.message}`,
            err.stack,
          );
        }),
      ),
    );
  }
}
