import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerCreatedEvent } from '../../domain/events/customer-created.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';
import { CreateCustomerCommand, CustomerDto, toCustomerDto } from '../dtos/customer.dto';
import { CustomerValidationService } from '../services/customer-validation.service';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly validationService: CustomerValidationService,
  ) {}

  async execute(command: CreateCustomerCommand): Promise<CustomerDto> {
    if (command.documentId) {
      await this.validationService.assertDocumentIdUniqueInOrg(
        command.documentId,
        command.organizationId,
      );
    }

    const attributes = await this.validationService.validateAttributes(
      command.organizationId,
      command.attributes,
    );

    const customer = await this.customerRepository.create({
      id: randomUUID(),
      organizationId: command.organizationId,
      name: command.name,
      email: command.email ?? null,
      phone: command.phone ?? null,
      documentId: command.documentId ?? null,
      attributes,
    });

    await this.eventBus.publish(
      new CustomerCreatedEvent(customer.id, customer.organizationId, customer.name.getValue()),
    );

    return toCustomerDto(customer);
  }
}
