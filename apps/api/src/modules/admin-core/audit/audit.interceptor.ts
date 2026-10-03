import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AdminAuditService } from './admin-audit.service';
import { SKIP_AUDIT_KEY, ADMIN_PERMISSION_KEY } from '../rbac/require-permission.decorator';
import { AdminRequest } from '../rbac/admin-auth.guard';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AdminAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const adminUser = request.adminUser;
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    const action = requiredPermission || `${request.method.toLowerCase()}:${request.route?.path || 'admin_route'}`;
    const resourceType = request.route?.path?.split('/')[3] || 'admin_resource';
    const rawId = request.params?.id || request.params?.key;
    const resourceId = rawId ? (Array.isArray(rawId) ? String(rawId[0]) : String(rawId)) : null;

    const beforeState = {
      params: request.params,
      query: request.query,
      body: request.body,
    };

    return next.handle().pipe(
      tap(async (responseBody) => {
        // If it's a GET request that is not sensitive read, we might log lightweight
        // All mutations (POST, PUT, PATCH, DELETE) and sensitive endpoints are logged
        try {
          await this.auditService.logEvent({
            actor_admin_id: adminUser?.id || null,
            actor_role_at_time: adminUser?.roles?.[0] || 'admin',
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            outcome: 'success',
            before_state: beforeState,
            after_state: responseBody,
            session_id: adminUser?.sessionId || null,
            ip_address: clientIp,
            user_agent: userAgent,
          });
        } catch (err: any) {
          this.logger.error(`AuditInterceptor tap logging failed: ${err.message}`);
        }
      }),
      catchError((error) => {
        // On error or denied access, log audit event
        const outcome = error.status === 403 || error.status === 401 ? 'denied' : 'error';
        this.auditService
          .logEvent({
            actor_admin_id: adminUser?.id || null,
            actor_role_at_time: adminUser?.roles?.[0] || 'unknown',
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            outcome,
            reason: error.message || 'Execution failed',
            before_state: beforeState,
            session_id: adminUser?.sessionId || null,
            ip_address: clientIp,
            user_agent: userAgent,
          })
          .catch((err) => {
            this.logger.error(`AuditInterceptor catch logging failed: ${err.message}`);
          });

        return throwError(() => error);
      })
    );
  }
}
