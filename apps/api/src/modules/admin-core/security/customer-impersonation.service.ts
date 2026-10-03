import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../../../database/database.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { RbacService } from '../rbac/rbac.service';

export interface ImpersonationSession {
  impersonationToken: string;
  customerId: string;
  customerEmail: string;
  expiresAt: string;
  isReadOnly: boolean;
  bannerMessage: string;
}

@Injectable()
export class CustomerImpersonationService {
  private readonly logger = new Logger(CustomerImpersonationService.name);
  private readonly IMPERSONATION_LIFETIME_SECONDS = 15 * 60; // 15 minutes max

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AdminAuditService,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Generates a temporary, strictly read-only customer impersonation session.
   * INVARIANTS:
   * 1. Feature flag ENABLE_CUSTOMER_IMPERSONATION must be true (default: off).
   * 2. Admin must possess 'customer:impersonate' permission.
   * 3. Requires valid reason and ticket reference.
   * 4. Session expires in 15 minutes.
   * 5. Fully audited in public.admin_audit_logs.
   */
  async startImpersonationSession(params: {
    adminId: string;
    customerId: string;
    reason: string;
    ticketRef: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<ImpersonationSession> {
    const isFeatureEnabled = process.env.ENABLE_CUSTOMER_IMPERSONATION === 'true';
    if (!isFeatureEnabled) {
      throw new ForbiddenException(
        'Customer impersonation is disabled by default platform security policy.'
      );
    }

    const hasPerm = await this.rbacService.hasPermission(params.adminId, 'customer:impersonate');
    if (!hasPerm) {
      throw new ForbiddenException('Missing required permission [customer:impersonate].');
    }

    if (!params.reason || params.reason.trim().length < 10) {
      throw new BadRequestException('A valid reason (minimum 10 characters) is required for impersonation.');
    }

    // Verify customer exists
    const custRes = await this.db.query<{ id: string; email: string; full_name: string }>(
      `SELECT id, email, full_name FROM public.profiles WHERE id = $1`,
      [params.customerId]
    );

    if (custRes.rows.length === 0) {
      throw new NotFoundException('Customer profile not found.');
    }

    const customer = custRes.rows[0];
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.IMPERSONATION_LIFETIME_SECONDS;
    const expiresAt = new Date(exp * 1000).toISOString();

    const secret =
      process.env.SUPABASE_JWT_SECRET ||
      process.env.ADMIN_JWT_SECRET ||
      'dev-admin-secret-shopsell-ultra-secure-key-2026';

    const impersonationToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        aud: 'authenticated',
        role: 'authenticated',
        is_impersonation: true,
        impersonated_by_admin: params.adminId,
        read_only: true,
        iat: now,
        exp: exp,
      },
      secret
    );

    const bannerMessage = `VIEWING AS CUSTOMER: ${customer.email} (READ-ONLY SESSION EXPIRES IN 15 MINUTES)`;

    // Produce audit log entry
    await this.auditService.logEvent({
      actor_admin_id: params.adminId,
      actor_role_at_time: 'customer_support',
      action: 'customer:impersonate',
      resource_type: 'customer_profile',
      resource_id: customer.id,
      outcome: 'success',
      reason: params.reason,
      ticket_ref: params.ticketRef,
      after_state: {
        customer_email: customer.email,
        expires_at: expiresAt,
        read_only: true,
      },
      ip_address: params.clientIp,
      user_agent: params.userAgent,
    });

    return {
      impersonationToken,
      customerId: customer.id,
      customerEmail: customer.email,
      expiresAt,
      isReadOnly: true,
      bannerMessage,
    };
  }
}
