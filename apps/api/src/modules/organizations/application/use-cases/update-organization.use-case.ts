import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IOrganizationRepository } from '../../../../domain/repositories/organization.repository.interface';
import {
  IOrganizationManagementRepository,
} from '../../domain/repositories/organization-management.repository.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { ONBOARDING_TOKENS } from '../../organizations.tokens';
import { UpdateOrganizationCommand, UpdateOrganizationResult } from '../dtos/onboarding.dto';

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(ONBOARDING_TOKENS.ORGANIZATION_MANAGEMENT_REPOSITORY)
    private readonly mgmtRepo: IOrganizationManagementRepository,
  ) {}

  async execute(command: UpdateOrganizationCommand): Promise<UpdateOrganizationResult> {
    // Tenant isolation: actor can only update their own organization
    if (command.id !== command.organizationId) {
      throw new ForbiddenException('You can only update your own organization');
    }

    const org = await this.orgRepo.findById(command.id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Validate new slug uniqueness (if changing)
    if (command.slug && command.slug !== org.slug) {
      const taken = await this.orgRepo.existsBySlug(command.slug);
      if (taken) {
        throw new ConflictException(`Slug '${command.slug}' is already taken`);
      }
    }

    const updated = await this.mgmtRepo.update(command.id, {
      name: command.name,
      slug: command.slug,
    });

    return updated;
  }
}
