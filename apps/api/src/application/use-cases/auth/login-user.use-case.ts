import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { verifyPassword, hashToken } from '../../../shared/utils/hash.util';
import { LoginDto, LoginResponseDto } from '../../dtos/auth.dto';
import { JwtPayload } from '../../../shared/types/request-user.type';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKENS.REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const isValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const org = await this.organizationRepository.findBySlug(dto.organizationSlug);
    if (!org || !org.isActive) throw new UnauthorizedException('Organization not found');

    const membership = await this.membershipRepository.findByUserAndOrganization(user.id, org.id);
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    const payload: JwtPayload = {
      userId: user.id,
      organizationId: org.id,
      roleId: membership.roleId,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');
    const refreshExpiresInMs = this.configService.get<number>('jwt.refreshExpiresInMs', 604800000);

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    // jti guarantees uniqueness so rapid logins never produce a duplicate hash
    const rawRefreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    await this.refreshTokenRepository.create({
      id: randomUUID(),
      tokenHash: hashToken(rawRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresInMs),
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: 900 };
  }
}
