import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied: no user authenticated');
    }
    // ADMIN remains the backwards-compatible platform superuser. Operational
    // roles below can be granted with least privilege per competition desk.
    const hasRole = user.role === UserRole.ADMIN
      || requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: requires one of roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
