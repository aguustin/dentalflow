import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerDeletedEvent } from '../../domain/events/customer-deleted.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';

@Injectable()
export class DeleteCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const customer = await this.customerRepository.findById(id, organizationId);
    if (!customer) throw new NotFoundException('Customer not found');

    await this.customerRepository.delete(id, organizationId);

    await this.eventBus.publish(new CustomerDeletedEvent(id, organizationId));
  }
}
