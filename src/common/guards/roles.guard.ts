import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.team_memberships) {
      throw new ForbiddenException('User not found or has no team memberships');
    }

    const teamId = request.params.teamId || request.body?.team_id || request.query?.team_id;

    if (!teamId) {
      const hasRequiredRole = user.team_memberships.some((membership: any) =>
        requiredRoles.includes(membership.role),
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    }

    const membership = user.team_memberships.find((m: any) => m.team_id === teamId);

    if (!membership) {
      throw new ForbiddenException('User not a member of this team');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this team');
    }

    request.userTeamRole = membership.role;
    return true;
  }
}
