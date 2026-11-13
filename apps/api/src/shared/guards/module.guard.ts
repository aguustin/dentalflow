import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/require-module.decorator';
import { RequestUser } from '../types/request-user.type';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { TOKENS } from '../injection-tokens';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const user: RequestUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('No authenticated user');

    const org = await this.organizationRepository.findById(user.organizationId);
    if (!org?.hasModule(required)) {
      throw new ForbiddenException(`Module '${required}' is not enabled for this organization`);
    }
    return true;
  }
}
