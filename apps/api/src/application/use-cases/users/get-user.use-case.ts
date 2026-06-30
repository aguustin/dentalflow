import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { UserResponseDto } from '../../dtos/user.dto';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
  ) {}

  /**
   * Returns the user's profile.
   * When organizationId is provided (GET /users/:id), the user MUST be an active
   * member of that organization — cross-tenant access is denied.
   * When omitted (GET /users/me), the caller is retrieving their own data.
   */
  async execute(userId: string, organizationId?: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) throw new NotFoundException('User not found');

    if (organizationId) {
      const membership = await this.membershipRepository.findByUserAndOrganization(
        userId,
        organizationId,
      );
      if (!membership || !membership.isActive) {
        throw new ForbiddenException('User does not belong to this organization');
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
