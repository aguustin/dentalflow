import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface CustomerCreatedPayload {
  customerId: string;
  organizationId: string;
  name: string;
}

export class CustomerCreatedEvent extends DomainEvent<CustomerCreatedPayload> {
  constructor(customerId: string, organizationId: string, name: string) {
    super('customer.created', organizationId, { customerId, organizationId, name });
  }
}
