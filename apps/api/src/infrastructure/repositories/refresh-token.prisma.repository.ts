import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class RefreshTokenPrismaRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row ?? null;
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    return this.prisma.refreshToken.create({
      data: {
        id: data.id,
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
