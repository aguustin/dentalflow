import { Global, Module } from '@nestjs/common';
import { TOKENS } from '../../shared/injection-tokens';
import { UserPrismaRepository } from './user.prisma.repository';
import { OrganizationPrismaRepository } from './organization.prisma.repository';
import { MembershipPrismaRepository } from './membership.prisma.repository';
import { RolePrismaRepository } from './role.prisma.repository';
import { PermissionPrismaRepository } from './permission.prisma.repository';
import { RefreshTokenPrismaRepository } from './refresh-token.prisma.repository';

const repoProviders = [
  { provide: TOKENS.USER_REPOSITORY, useClass: UserPrismaRepository },
  { provide: TOKENS.ORGANIZATION_REPOSITORY, useClass: OrganizationPrismaRepository },
  { provide: TOKENS.MEMBERSHIP_REPOSITORY, useClass: MembershipPrismaRepository },
  { provide: TOKENS.ROLE_REPOSITORY, useClass: RolePrismaRepository },
  { provide: TOKENS.PERMISSION_REPOSITORY, useClass: PermissionPrismaRepository },
  { provide: TOKENS.REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenPrismaRepository },
];

@Global()
@Module({
  providers: repoProviders,
  exports: [
    TOKENS.USER_REPOSITORY,
    TOKENS.ORGANIZATION_REPOSITORY,
    TOKENS.MEMBERSHIP_REPOSITORY,
    TOKENS.ROLE_REPOSITORY,
    TOKENS.PERMISSION_REPOSITORY,
    TOKENS.REFRESH_TOKEN_REPOSITORY,
  ],
})
export class RepositoriesModule {}
