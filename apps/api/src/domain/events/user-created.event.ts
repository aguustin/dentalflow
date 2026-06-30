import { DomainEvent } from './domain-event.base';

interface UserCreatedPayload {
  userId: string;
  email: string;
}

export class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
  constructor(userId: string, email: string) {
    super('user.created', '', { userId, email });
  }

  get userId(): string { return this.payload.userId; }
  get email(): string { return this.payload.email; }
}
