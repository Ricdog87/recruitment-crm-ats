import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;

    const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!auditableMethods.includes(method) || !user) {
      return next.handle();
    }

    const url = request.url;
    const entityTypeMatch = url.match(/\/api\/(\w+)/);
    const entityType = entityTypeMatch ? entityTypeMatch[1] : null;

    if (!entityType || entityType === 'auth') {
      return next.handle();
    }

    const beforeData = method === 'PUT' || method === 'PATCH' ? request.body : null;

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const teamMembership = user.team_memberships?.[0];
          if (!teamMembership) return;

          const entityId =
            data?.id || request.params?.id || data?.[0]?.id || 'unknown';
          const action = this.getAction(method);

          await this.prisma.auditLog.create({
            data: {
              team_id: teamMembership.team_id,
              user_id: user.id,
              entity_type: entityType,
              entity_id: entityId,
              action,
              before_json: beforeData,
              after_json: data,
            },
          });
        } catch (error) {
          console.error('Audit log failed:', error);
        }
      }),
    );
  }

  private getAction(method: string): string {
    const actions: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actions[method] || 'UNKNOWN';
  }
}
