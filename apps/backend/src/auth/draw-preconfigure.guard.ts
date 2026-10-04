import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';

@Injectable()
export class DrawPreconfigureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user?.permissions?.includes(Permission.DRAW_PRECONFIGURE)) {
      throw new ForbiddenException('Bạn không có quyền DRAW_PRECONFIGURE');
    }
    return true;
  }
}
