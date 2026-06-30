import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { IEventBus } from '../../../shared/types/event-bus.interface';
import { MembershipCreatedEvent } from '../../../domain/events/membership-created.event';
import { TOKENS } from '../../../shared/injection-tokens';
import { AddUserToOrganizationDto } from '../../dtos/organization.dto';
import { RequestUser } from '../../../shared/types/request-user.type';

export interface AddUserResult {
  membershipId: string;
  userId: string;
  organizationId: string;
  roleId: string;
  joinedAt: Date;
}

@Injectable()
export class AddUserToOrganizationUseCase {
  constructor(
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(TOKENS.EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: AddUserToOrganizationDto, actor: RequestUser): Promise<AddUserResult> {
    const org = await this.organizationRepository.findById(actor.organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    const user = await this.userRepository.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const role = await this.roleRepository.findById(dto.roleId);
    if (!role || role.organizationId !== actor.organizationId) {
      throw new NotFoundException('Role not found in this organization');
    }

    const alreadyMember = await this.membershipRepository.existsByUserAndOrganization(
      dto.userId,
      actor.organizationId,
    );
    if (alreadyMember) throw new ConflictException('User is already a member of this organization');

    const membership = await this.membershipRepository.create({
      id: randomUUID(),
      userId: dto.userId,
      organizationId: actor.organizationId,
      roleId: dto.roleId,
    });

    await this.eventBus.publish(
      new MembershipCreatedEvent(membership.id, dto.userId, actor.organizationId, dto.roleId),
    );

    return {
      membershipId: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      roleId: membership.roleId,
      joinedAt: membership.joinedAt,
    };
  }
}
