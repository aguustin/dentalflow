import { Inject, Injectable } from '@nestjs/common';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IRoleRepository } from '../../../domain/repositories/role.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';

export interface MemberDto {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  joinedAt: Date;
}

@Injectable()
export class ListMembersUseCase {
  constructor(
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(organizationId: string): Promise<MemberDto[]> {
    const [memberships, roles] = await Promise.all([
      this.membershipRepository.findAllByOrganization(organizationId),
      this.roleRepository.findAllByOrganization(organizationId),
    ]);
    const roleNames = new Map(roles.map((r) => [r.id, r.name]));
    // Organizations have few members; one lookup per member is fine for now.
    const users = await Promise.all(memberships.map((m) => this.userRepository.findById(m.userId)));

    return memberships
      .map((m, i) => {
        const user = users[i];
        if (!user) return null;
        return {
          membershipId: m.id,
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: m.roleId,
          roleName: roleNames.get(m.roleId) ?? '—',
          isActive: m.isActive,
          joinedAt: m.joinedAt,
        };
      })
      .filter((m): m is MemberDto => m !== null)
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }
}
