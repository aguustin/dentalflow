export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateRefreshTokenData {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export interface IRefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
