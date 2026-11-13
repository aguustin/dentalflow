import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface CustomerUpdatedPayload {
  customerId: string;
  organizationId: string;
  name: string;
}

export class CustomerUpdatedEvent extends DomainEvent<CustomerUpdatedPayload> {
  constructor(customerId: string, organizationId: string, name: string) {
    super('customer.updated', organizationId, { customerId, organizationId, name });
  }
}
