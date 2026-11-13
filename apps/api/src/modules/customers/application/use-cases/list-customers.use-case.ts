import { Inject, Injectable } from '@nestjs/common';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';
import { ListCustomersFilters, ListCustomersResult, toCustomerDto } from '../dtos/customer.dto';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ListCustomersUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(organizationId: string, filters?: ListCustomersFilters): Promise<ListCustomersResult> {
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const { items, total } = await this.customerRepository.findAll(organizationId, {
      name: filters?.name,
      limit,
      offset,
    });

    return {
      items: items.map(toCustomerDto),
      total,
      limit,
      offset,
    };
  }
}
