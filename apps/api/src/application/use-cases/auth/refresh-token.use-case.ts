import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { hashToken } from '../../../shared/utils/hash.util';
import { RefreshTokenDto, LoginResponseDto } from '../../dtos/auth.dto';
import { JwtPayload } from '../../../shared/types/request-user.type';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKENS.REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<LoginResponseDto> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    // Verify signature and expiry — throws if invalid or expired
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) throw new UnauthorizedException('Refresh token not found');

    // Token reuse detection: a revoked token being presented means the token family
    // is compromised. Invalidate ALL sessions for this user immediately.
    if (stored.revokedAt) {
      await this.refreshTokenRepository.revokeAllForUser(payload.userId);
      throw new UnauthorizedException('Token reuse detected — all sessions have been invalidated');
    }

    // Rotate: revoke old token, issue new pair
    await this.refreshTokenRepository.revoke(stored.id);

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');
    const refreshExpiresInMs = this.configService.get<number>('jwt.refreshExpiresInMs', 604800000);

    const newPayload: JwtPayload = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      roleId: payload.roleId,
    };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const newRefreshToken = this.jwtService.sign(
      { ...newPayload, jti: randomUUID() },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    await this.refreshTokenRepository.create({
      id: randomUUID(),
      tokenHash: hashToken(newRefreshToken),
      userId: payload.userId,
      expiresAt: new Date(Date.now() + refreshExpiresInMs),
    });

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
  }
}
