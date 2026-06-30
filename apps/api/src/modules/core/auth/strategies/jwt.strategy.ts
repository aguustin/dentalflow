import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IMembershipRepository } from '../../../../domain/repositories/membership.repository.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { JwtPayload, RequestUser } from '../../../../shared/types/request-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: IMembershipRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret', 'insecure-access-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const membership = await this.membershipRepository.findByUserAndOrganization(
      payload.userId,
      payload.organizationId,
    );

    if (!membership || !membership.isActive) {
      throw new UnauthorizedException('Membership is no longer active');
    }

    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      roleId: payload.roleId,
    };
  }
}
