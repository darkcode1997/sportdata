import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class DrawPreconfigureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== UserRole.ADMIN || !user.permissions?.includes(Permission.DRAW_PRECONFIGURE)) {
      throw new ForbiddenException('Chỉ Quản trị hệ thống được cấp quyền Đặt trước cặp & preview cây đấu mới được sử dụng chức năng này');
    }
    return true;
  }
}
