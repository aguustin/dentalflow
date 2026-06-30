import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface OwnerAssignedPayload {
  organizationId: string;
  ownerUserId: string;
  adminRoleId: string;
  membershipId: string;
}

export class OwnerAssignedEvent extends DomainEvent<OwnerAssignedPayload> {
  constructor(
    organizationId: string,
    ownerUserId: string,
    adminRoleId: string,
    membershipId: string,
  ) {
    super('organization.owner_assigned', organizationId, {
      organizationId,
      ownerUserId,
      adminRoleId,
      membershipId,
    });
  }
}
