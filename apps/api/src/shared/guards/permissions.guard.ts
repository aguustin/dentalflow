import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestUser } from '../types/request-user.type';
import { IPermissionRepository } from '../../domain/repositories/permission.repository.interface';
import { TOKENS } from '../injection-tokens';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKENS.PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) throw new ForbiddenException('No authenticated user');

    for (const permKey of required) {
      const [resource, action] = permKey.split('.');
      const hasPermission = await this.permissionRepository.roleHasPermission(
        user.roleId,
        resource,
        action,
      );
      if (!hasPermission) {
        throw new ForbiddenException(`Missing permission: ${permKey}`);
      }
    }

    return true;
  }
}
