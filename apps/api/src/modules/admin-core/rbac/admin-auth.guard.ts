import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ADMIN_PERMISSION_KEY, IS_PUBLIC_ADMIN_KEY } from './require-permission.decorator';
import { AdminAuthService } from '../auth/admin-auth.service';
import { RbacService } from './rbac.service';
import { AdminAuditService } from '../audit/admin-audit.service';

export interface AdminRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    roles: string[];
    sessionId: string;
  };
  actorAdminId?: string;
  adminRoles?: string[];
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly adminAuthService: AdminAuthService,
    private readonly rbacService: RbacService,
    private readonly auditService: AdminAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      ADMIN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // DENY BY DEFAULT: If no permission decorator is present, unconditionally reject.
    if (!requiredPermission) {
      this.logger.error(
        `Security Invariant Violation: Route ${context.getClass().name}#${
          context.getHandler().name
        } is missing @RequirePermission decorator. Denying by default.`
      );
      throw new ForbiddenException(
        'Access denied by default: admin endpoint is missing explicit permission decorator.'
      );
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.socket.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    // 1. IP allowlist check if configured
    const ipAllowlist = process.env.ADMIN_IP_ALLOWLIST;
    if (ipAllowlist && ipAllowlist.trim().length > 0) {
      const allowedIps = ipAllowlist.split(',').map((ip) => ip.trim());
      if (!allowedIps.includes(clientIp)) {
        await this.auditService.logEvent({
          actor_role_at_time: 'unknown',
          action: 'admin:ip_blocked',
          resource_type: 'network_firewall',
          outcome: 'denied',
          reason: `Client IP ${clientIp} not in allowlist.`,
          ip_address: clientIp,
          user_agent: userAgent,
        });
        throw new ForbiddenException('Network Access Denied: Client IP not allowed.');
      }
    }

    // 2. Extract admin token.
    // SECURITY INVARIANT: NEVER accept 'shopsell_token' (customer session token).
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && request.cookies['shopsell_admin_token']) {
      token = request.cookies['shopsell_admin_token'];
    }

    if (!token) {
      throw new UnauthorizedException('Admin authentication required.');
    }

    // 3. Verify admin session token
    let adminAuth;
    try {
      adminAuth = await this.adminAuthService.verifyAdminToken(token);
    } catch (err: any) {
      await this.auditService.logEvent({
        actor_role_at_time: 'unknown',
        action: 'admin:auth_failed',
        resource_type: 'admin_session',
        outcome: 'denied',
        reason: err.message,
        ip_address: clientIp,
        user_agent: userAgent,
      });
      throw err;
    }

    const { admin, roles, sessionId } = adminAuth;

    // Attach to request
    request.adminUser = {
      id: admin.id,
      email: admin.email,
      roles,
      sessionId,
    };
    request.actorAdminId = admin.id;
    request.adminRoles = roles;

    // 4. Enforce Granular Permission Check
    const hasPerm = await this.rbacService.hasPermission(admin.id, requiredPermission);
    if (!hasPerm) {
      await this.auditService.logEvent({
        actor_admin_id: admin.id,
        actor_role_at_time: roles[0] || 'admin',
        action: 'admin:permission_denied',
        resource_type: 'permission',
        resource_id: requiredPermission,
        outcome: 'denied',
        reason: `Missing permission ${requiredPermission}`,
        session_id: sessionId,
        ip_address: clientIp,
        user_agent: userAgent,
      });

      throw new ForbiddenException(
        `Access Denied: Missing required permission [${requiredPermission}].`
      );
    }

    // 5. Enforce Step-up Re-authentication for Critical Permissions
    // Actions involving payout approval, bank detail change, or pii reveal require fresh step-up
    const stepUpPermissions = ['payout:approve', 'seller:bank_detail_change', 'pii:reveal', 'kill_switch:manage'];
    if (stepUpPermissions.includes(requiredPermission)) {
      const stepUpToken = request.headers['x-step-up-token'] as string;
      const isValidStepUp = await this.adminAuthService.validateStepUpToken(stepUpToken);
      if (!isValidStepUp) {
        throw new ForbiddenException(
          'Step-up re-authentication required for this sensitive action. Please confirm with passkey.'
        );
      }
    }

    return true;
  }
}
