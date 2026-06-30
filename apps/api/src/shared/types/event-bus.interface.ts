import { DomainEvent } from '../../domain/events/domain-event.base';

export interface IEventHandler<T extends DomainEvent<object>> {
  handle(event: T): Promise<void>;
}

export interface IEventBus {
  publish<T extends DomainEvent<object>>(event: T): Promise<void>;
  subscribe<T extends DomainEvent<object>>(eventName: string, handler: IEventHandler<T>): void;
}
