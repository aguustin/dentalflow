import { DomainEvent } from './domain-event.base';

interface OrganizationCreatedPayload {
  organizationId: string;
  slug: string;
}

export class OrganizationCreatedEvent extends DomainEvent<OrganizationCreatedPayload> {
  constructor(organizationId: string, slug: string) {
    super('organization.created', organizationId, { organizationId, slug });
  }

  get slug(): string { return this.payload.slug; }
}
