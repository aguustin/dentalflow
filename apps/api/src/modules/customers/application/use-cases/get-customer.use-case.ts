import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';
import { CustomerDto, toCustomerDto } from '../dtos/customer.dto';

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<CustomerDto> {
    const customer = await this.customerRepository.findById(id, organizationId);
    if (!customer) throw new NotFoundException('Customer not found');
    return toCustomerDto(customer);
  }
}
