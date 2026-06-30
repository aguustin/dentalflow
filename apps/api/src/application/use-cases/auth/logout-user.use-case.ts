import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { hashToken } from '../../../shared/utils/hash.util';
import { LogoutDto } from '../../dtos/auth.dto';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(TOKENS.REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(dto: LogoutDto): Promise<void> {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    await this.refreshTokenRepository.revoke(stored.id);
  }
}
