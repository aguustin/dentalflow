import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { IOrganizationRepository } from '../../../../domain/repositories/organization.repository.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { Attributes, getVertical, validateAttributes } from '../../../../shared/verticals';
import { CUSTOMER_REPOSITORY_TOKEN } from '../../customers.tokens';

@Injectable()
export class CustomerValidationService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY_TOKEN)
    private readonly customerRepository: ICustomerRepository,
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  /** Validates attributes against the customer schema of the organization's vertical. */
  async validateAttributes(organizationId: string, input: unknown): Promise<Attributes> {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) throw new NotFoundException('Organization not found');
    return validateAttributes(getVertical(org.vertical).customerAttributes, input);
  }

  async assertDocumentIdUniqueInOrg(
    documentId: string,
    organizationId: string,
    excludeCustomerId?: string,
  ): Promise<void> {
    const existing = await this.customerRepository.findByDocumentId(documentId, organizationId);
    if (existing && existing.id !== excludeCustomerId) {
      throw new ConflictException(
        `A customer with document '${documentId}' already exists in this organization`,
      );
    }
  }
}
