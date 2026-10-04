import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { RbacService } from './rbac.service';
import { AdminAuthService } from '../auth/admin-auth.service';

export interface AdminAccessReviewItem {
  admin_id: string;
  email: string;
  full_name: string;
  status: string;
  roles: {
    assignment_id: string;
    role_name: string;
    role_slug: string;
    scope_type?: string | null;
    scope_value?: string | null;
    expires_at?: string | null;
  }[];
  active_elevations_count: number;
  last_review_at: string | null;
  is_overdue: boolean; // Overdue if last_review_at is null or older than 90 days
}

@Injectable()
export class AccessReviewService {
  private readonly logger = new Logger(AccessReviewService.name);
  private readonly REVIEW_CYCLE_DAYS = 90;

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AdminAuditService,
    private readonly rbacService: RbacService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  /**
   * Generates the quarterly access review report listing all active admin identities,
   * their active roles, elevated grants, last review date, and overdue flag.
   */
  async getAccessReviewReport(): Promise<AdminAccessReviewItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.REVIEW_CYCLE_DAYS);

    const adminsRes = await this.db.query<{
      id: string;
      email: string;
      full_name: string;
      status: string;
      last_review_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, email, full_name, status, last_review_at, created_at
       FROM public.admin_users
       WHERE status = 'active'
       ORDER BY last_review_at ASC NULLS FIRST, full_name ASC`
    );

    const report: AdminAccessReviewItem[] = [];

    for (const admin of adminsRes.rows) {
      // 1. Fetch role assignments
      const rolesRes = await this.db.query<{
        assignment_id: string;
        role_name: string;
        role_slug: string;
        scope_type?: string | null;
        scope_value?: string | null;
        expires_at?: Date | null;
      }>(
        `SELECT ara.id AS assignment_id, r.name AS role_name, r.slug AS role_slug,
                ara.scope_type, ara.scope_value, ara.expires_at
         FROM public.admin_role_assignments ara
         JOIN public.roles r ON r.id = ara.role_id
         WHERE ara.admin_id = $1
           AND (ara.expires_at IS NULL OR ara.expires_at > NOW())`,
        [admin.id]
      );

      // 2. Fetch active elevations
      const elevRes = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM public.elevated_access_grants
         WHERE admin_id = $1
           AND is_revoked = false
           AND starts_at <= NOW()
           AND expires_at > NOW()`,
        [admin.id]
      );

      const lastReview = admin.last_review_at ? new Date(admin.last_review_at) : null;
      const isOverdue = !lastReview || lastReview < cutoffDate;

      report.push({
        admin_id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        status: admin.status,
        roles: rolesRes.rows.map((r) => ({
          ...r,
          expires_at: r.expires_at ? r.expires_at.toISOString() : null,
        })),
        active_elevations_count: parseInt(elevRes.rows[0]?.count || '0', 10),
        last_review_at: lastReview ? lastReview.toISOString() : null,
        is_overdue: isOverdue,
      });
    }

    return report;
  }

  /**
   * Attests that an admin's role assignments and privileges have been reviewed and approved.
   */
  async attestAdminAccess(adminId: string, reviewerAdminId: string, notes?: string): Promise<void> {
    const res = await this.db.query(
      `UPDATE public.admin_users
       SET last_review_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [adminId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Active admin user not found.');
    }

    await this.auditService.logEvent({
      actor_admin_id: reviewerAdminId,
      actor_role_at_time: 'auditor',
      action: 'access_review:attest',
      resource_type: 'admin_user',
      resource_id: adminId,
      outcome: 'success',
      reason: notes || 'Quarterly access review completed and privileges attested.',
    });
  }

  /**
   * Revokes a specific role assignment during access review.
   */
  async revokeRoleAssignment(assignmentId: string, reviewerAdminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Reason required for revoking access role.');
    }

    const res = await this.db.query<{ admin_id: string; role_id: string }>(
      `DELETE FROM public.admin_role_assignments
       WHERE id = $1
       RETURNING admin_id, role_id`,
      [assignmentId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException('Role assignment not found.');
    }

    const { admin_id, role_id } = res.rows[0];

    // Invalidate cached permissions
    await this.rbacService.invalidateAdminPermissions(admin_id);

    await this.auditService.logEvent({
      actor_admin_id: reviewerAdminId,
      actor_role_at_time: 'auditor',
      action: 'access_review:revoke_role',
      resource_type: 'admin_role_assignment',
      resource_id: assignmentId,
      outcome: 'success',
      reason,
      after_state: { admin_id, role_id },
    });
  }

  /**
   * Immediate Admin Offboarding:
   * Revokes all active sessions, elevated grants, and marks admin status as 'offboarded'.
   */
  async offboardAdmin(adminId: string, actorAdminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Detailed reason required for offboarding admin.');
    }

    await this.db.withTransaction(async (client) => {
      // 1. Mark status offboarded
      const updateRes = await client.query(
        `UPDATE public.admin_users
         SET status = 'offboarded', updated_at = NOW()
         WHERE id = $1 AND status != 'offboarded'
         RETURNING *`,
        [adminId]
      );

      if (updateRes.rows.length === 0) {
        throw new NotFoundException('Admin user not found or already offboarded.');
      }

      // 2. Revoke all elevated grants
      await client.query(
        `UPDATE public.elevated_access_grants
         SET is_revoked = true, revoked_at = NOW()
         WHERE admin_id = $1 AND is_revoked = false`,
        [adminId]
      );

      // 3. Delete or expire role assignments
      await client.query(
        `DELETE FROM public.admin_role_assignments WHERE admin_id = $1`,
        [adminId]
      );
    });

    // 4. Blacklist all sessions in Redis and purge permission cache
    await this.adminAuthService.revokeAllAdminSessions(adminId, actorAdminId, reason);

    this.logger.log(`Admin ${adminId} successfully offboarded by ${actorAdminId}.`);
  }
}
