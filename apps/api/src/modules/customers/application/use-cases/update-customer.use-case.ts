import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerUpdatedEvent } from '../../domain/events/customer-updated.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';
import { UpdateCustomerCommand, CustomerDto, toCustomerDto } from '../dtos/customer.dto';
import { CustomerValidationService } from '../services/customer-validation.service';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly validationService: CustomerValidationService,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    command: UpdateCustomerCommand,
  ): Promise<CustomerDto> {
    const existing = await this.customerRepository.findById(id, organizationId);
    if (!existing) throw new NotFoundException('Customer not found');

    if (command.documentId && command.documentId !== existing.documentId) {
      await this.validationService.assertDocumentIdUniqueInOrg(
        command.documentId,
        organizationId,
        id,
      );
    }

    const attributes =
      command.attributes !== undefined
        ? await this.validationService.validateAttributes(organizationId, command.attributes)
        : undefined;

    const updated = await this.customerRepository.update(id, organizationId, {
      ...command,
      attributes,
    });
    if (!updated) throw new NotFoundException('Customer not found');

    await this.eventBus.publish(
      new CustomerUpdatedEvent(id, organizationId, updated.name.getValue()),
    );

    return toCustomerDto(updated);
  }
}
