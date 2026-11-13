import { DomainEvent } from '../../../../domain/events/domain-event.base';

interface CustomerDeletedPayload {
  customerId: string;
  organizationId: string;
}

export class CustomerDeletedEvent extends DomainEvent<CustomerDeletedPayload> {
  constructor(customerId: string, organizationId: string) {
    super('customer.deleted', organizationId, { customerId, organizationId });
  }
}
