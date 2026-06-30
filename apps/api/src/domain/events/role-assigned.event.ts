import { DomainEvent } from './domain-event.base';

interface RoleAssignedPayload {
  userId: string;
  organizationId: string;
  roleId: string;
}

export class RoleAssignedEvent extends DomainEvent<RoleAssignedPayload> {
  constructor(userId: string, organizationId: string, roleId: string) {
    super('role.assigned', organizationId, { userId, organizationId, roleId });
  }

  get userId(): string { return this.payload.userId; }
  get roleId(): string { return this.payload.roleId; }
}
