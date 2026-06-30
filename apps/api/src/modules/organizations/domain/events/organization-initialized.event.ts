import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface OrganizationInitializedPayload {
  organizationId: string;
  slug: string;
  ownerUserId: string;
  planName: string;
}

export class OrganizationInitializedEvent extends DomainEvent<OrganizationInitializedPayload> {
  constructor(
    organizationId: string,
    slug: string,
    ownerUserId: string,
    planName: string,
  ) {
    super('organization.initialized', organizationId, {
      organizationId,
      slug,
      ownerUserId,
      planName,
    });
  }
}
