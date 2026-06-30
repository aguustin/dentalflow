import { DomainEvent } from './domain-event.base';

interface MembershipCreatedPayload {
  membershipId: string;
  userId: string;
  organizationId: string;
  roleId: string;
}

export class MembershipCreatedEvent extends DomainEvent<MembershipCreatedPayload> {
  constructor(membershipId: string, userId: string, organizationId: string, roleId: string) {
    super('membership.created', organizationId, { membershipId, userId, organizationId, roleId });
  }

  get membershipId(): string { return this.payload.membershipId; }
  get userId(): string { return this.payload.userId; }
  get roleId(): string { return this.payload.roleId; }
}
