import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { CreateRoleDto, RoleResponseDto } from '../../dtos/role.dto';
import { RequestUser } from '../../../shared/types/request-user.type';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(dto: CreateRoleDto, actor: RequestUser): Promise<RoleResponseDto> {
    const exists = await this.roleRepository.existsByNameAndOrganization(
      dto.name,
      actor.organizationId,
    );
    if (exists) throw new ConflictException('Role already exists in this organization');

    const role = await this.roleRepository.create({
      id: randomUUID(),
      name: dto.name,
      organizationId: actor.organizationId,
    });

    return {
      id: role.id,
      name: role.name,
      organizationId: role.organizationId,
      createdAt: role.createdAt,
    };
  }
}
