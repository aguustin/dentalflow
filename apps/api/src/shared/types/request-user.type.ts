export interface RequestUser {
  userId: string;
  organizationId: string;
  roleId: string;
}

export interface JwtPayload {
  userId: string;
  organizationId: string;
  roleId: string;
  jti?: string;
}
