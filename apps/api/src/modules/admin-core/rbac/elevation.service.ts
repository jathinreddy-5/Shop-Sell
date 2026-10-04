import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RbacService } from './rbac.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { ADMIN_ALERT_SINK_TOKEN, AdminAlertSink } from '../audit/admin-alert.interface';
import { ElevatedAccessGrant } from '@shop-sell/shared';

@Injectable()
export class ElevationService {
  private readonly logger = new Logger(ElevationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly rbacService: RbacService,
    private readonly auditService: AdminAuditService,
    @Inject(ADMIN_ALERT_SINK_TOKEN) private readonly alertSink: AdminAlertSink,
  ) {}

  /**
   * Emergency Break-Glass Path:
   * Single-actor emergency access with mandatory reason and ticket ref.
   * Auto-expires (default max 60 minutes).
   * Generates loud immutable audit entry and broadcasts high-severity alert to Super Admins & Compliance.
   */
  async activateBreakGlass(params: {
    adminId: string;
    roleId?: string;
    permissionId?: string;
    reason: string;
    ticketRef: string;
    durationMinutes?: number;
    clientIp?: string;
    userAgent?: string;
  }): Promise<ElevatedAccessGrant> {
    if (!params.reason || params.reason.trim().length < 15) {
      throw new BadRequestException(
        'Break-glass activation requires a detailed justification reason (minimum 15 characters).'
      );
    }
    if (!params.ticketRef || params.ticketRef.trim().length < 3) {
      throw new BadRequestException(
        'Break-glass activation requires a valid incident or ticket reference (e.g. INC-1029).'
      );
    }

    const duration = Math.min(params.durationMinutes || 60, 120); // capped at 2 hours max
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    const res = await this.db.query<ElevatedAccessGrant>(
      `INSERT INTO public.elevated_access_grants (
         admin_id, role_id, permission_id, reason, ticket_ref,
         approved_by, starts_at, expires_at, is_revoked, is_break_glass
       )
       VALUES ($1, $2, $3, $4, $5, $1, NOW(), $6, false, true)
       RETURNING *`,
      [
        params.adminId,
        params.roleId || null,
        params.permissionId || null,
        `[BREAK-GLASS EMERGENCY] ${params.reason}`,
        params.ticketRef,
        expiresAt,
      ]
    );

    const grant = res.rows[0];

    // Invalidate permission cache so elevated grant takes effect instantly
    await this.rbacService.invalidateAdminPermissions(params.adminId);

    // 1. Loud audit entry
    await this.auditService.logEvent({
      actor_admin_id: params.adminId,
      actor_role_at_time: 'emergency_responder',
      action: 'break_glass:activate',
      resource_type: 'elevated_access_grant',
      resource_id: grant.id,
      outcome: 'success',
      reason: params.reason,
      ticket_ref: params.ticketRef,
      after_state: {
        grant_id: grant.id,
        duration_minutes: duration,
        expires_at: expiresAt.toISOString(),
      },
      ip_address: params.clientIp,
      user_agent: params.userAgent,
    });

    // 2. High-priority anomaly alert to Super Admins & Compliance
    await this.alertSink.dispatchAlert({
      alertType: 'BREAK_GLASS_INVOKED',
      severity: 'CRITICAL',
      title: 'CRITICAL: Break-Glass Emergency Elevation Activated',
      description: `Admin ${params.adminId} activated emergency break-glass elevation for ticket ${params.ticketRef}. Justification: "${params.reason}". Grant expires in ${duration} minutes.`,
      actorAdminId: params.adminId,
      metadata: {
        ticketRef: params.ticketRef,
        grantId: grant.id,
        expiresAt: expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return grant;
  }

  /**
   * Standard JIT Elevation Request (Requires dual-approval or Super Admin sign-off).
   */
  async requestJitElevation(params: {
    adminId: string;
    roleId?: string;
    permissionId?: string;
    reason: string;
    ticketRef: string;
    durationMinutes: number;
  }): Promise<ElevatedAccessGrant> {
    const duration = Math.min(params.durationMinutes || 60, 480); // max 8 hours
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    const res = await this.db.query<ElevatedAccessGrant>(
      `INSERT INTO public.elevated_access_grants (
         admin_id, role_id, permission_id, reason, ticket_ref,
         starts_at, expires_at, is_revoked, is_break_glass
       )
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, false, false)
       RETURNING *`,
      [
        params.adminId,
        params.roleId || null,
        params.permissionId || null,
        params.reason,
        params.ticketRef,
        expiresAt,
      ]
    );

    const grant = res.rows[0];

    await this.auditService.logEvent({
      actor_admin_id: params.adminId,
      actor_role_at_time: 'admin',
      action: 'jit_elevation:requested',
      resource_type: 'elevated_access_grant',
      resource_id: grant.id,
      outcome: 'success',
      reason: params.reason,
      ticket_ref: params.ticketRef,
    });

    return grant;
  }

  /**
   * Revokes an active elevated grant immediately.
   */
  async revokeGrant(grantId: string, actorAdminId: string, reason: string): Promise<void> {
    const res = await this.db.query<ElevatedAccessGrant>(
      `UPDATE public.elevated_access_grants
       SET is_revoked = true, revoked_at = NOW()
       WHERE id = $1 AND is_revoked = false
       RETURNING *`,
      [grantId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Active elevated grant not found or already revoked.');
    }

    const grant = res.rows[0];
    await this.rbacService.invalidateAdminPermissions(grant.admin_id);

    await this.auditService.logEvent({
      actor_admin_id: actorAdminId,
      actor_role_at_time: 'admin',
      action: 'elevation:revoked',
      resource_type: 'elevated_access_grant',
      resource_id: grant.id,
      outcome: 'success',
      reason,
    });
  }

  /**
   * Retrieves all active elevated grants across the platform.
   */
  async getActiveGrants(): Promise<ElevatedAccessGrant[]> {
    const res = await this.db.query<ElevatedAccessGrant>(
      `SELECT * FROM public.elevated_access_grants
       WHERE is_revoked = false
         AND starts_at <= NOW()
         AND expires_at > NOW()
       ORDER BY starts_at DESC`
    );
    return res.rows;
  }
}
