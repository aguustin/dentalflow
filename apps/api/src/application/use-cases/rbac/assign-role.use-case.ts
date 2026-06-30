import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { IEventBus } from '../../../shared/types/event-bus.interface';
import { RoleAssignedEvent } from '../../../domain/events/role-assigned.event';
import { TOKENS } from '../../../shared/injection-tokens';
import { AssignRoleDto } from '../../dtos/role.dto';
import { RequestUser } from '../../../shared/types/request-user.type';

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(TOKENS.EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: AssignRoleDto, actor: RequestUser): Promise<void> {
    const role = await this.roleRepository.findById(dto.roleId);
    if (!role || role.organizationId !== actor.organizationId) {
      throw new NotFoundException('Role not found in this organization');
    }

    const membership = await this.membershipRepository.findByUserAndOrganization(
      dto.userId,
      actor.organizationId,
    );
    if (!membership) throw new NotFoundException('User is not a member of this organization');

    await this.membershipRepository.updateRole(membership.id, dto.roleId);

    await this.eventBus.publish(
      new RoleAssignedEvent(dto.userId, actor.organizationId, dto.roleId),
    );
  }
}
