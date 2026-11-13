import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { IEventBus } from '../../../shared/types/event-bus.interface';
import { OrganizationCreatedEvent } from '../../../domain/events/organization-created.event';
import { MembershipCreatedEvent } from '../../../domain/events/membership-created.event';
import { TOKENS } from '../../../shared/injection-tokens';
import { hashPassword } from '../../../shared/utils/hash.util';
import { DEFAULT_VERTICAL, getVertical } from '../../../shared/verticals';
import { CreateOrganizationDto, OrganizationResponseDto } from '../../dtos/organization.dto';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(TOKENS.EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const slugExists = await this.organizationRepository.existsBySlug(dto.slug);
    if (slugExists) throw new ConflictException('Organization slug already taken');

    const org = await this.organizationRepository.create({
      id: randomUUID(),
      name: dto.name,
      slug: dto.slug,
      vertical: DEFAULT_VERTICAL,
      enabledModules: [...getVertical(DEFAULT_VERTICAL).modules],
    });

    // Bootstrap admin role for this organization
    const adminRole = await this.roleRepository.create({
      id: randomUUID(),
      name: 'admin',
      organizationId: org.id,
    });

    // Create or find admin user
    let adminUser = await this.userRepository.findByEmail(dto.adminEmail);
    if (!adminUser) {
      const passwordHash = await hashPassword(dto.adminPassword);
      adminUser = await this.userRepository.create({
        id: randomUUID(),
        email: dto.adminEmail,
        passwordHash,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
      });
    }

    // Create admin membership
    const membership = await this.membershipRepository.create({
      id: randomUUID(),
      userId: adminUser.id,
      organizationId: org.id,
      roleId: adminRole.id,
    });

    await this.eventBus.publish(new OrganizationCreatedEvent(org.id, org.slug));
    await this.eventBus.publish(
      new MembershipCreatedEvent(membership.id, adminUser.id, org.id, adminRole.id),
    );

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }
}
