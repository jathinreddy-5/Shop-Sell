import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AdminRedisService } from '../redis/admin-redis.service';

export interface AdminRoleInfo {
  id: string;
  name: string;
  slug: string;
  scope_type?: string | null;
  scope_value?: string | null;
  expires_at?: Date | null;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes cache

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: AdminRedisService,
  ) {}

  private getPermCacheKey(adminId: string): string {
    return `admin:perms:${adminId}`;
  }

  private getRolesCacheKey(adminId: string): string {
    return `admin:roles:${adminId}`;
  }

  /**
   * Retrieves all active granular permissions for an admin user.
   * Aggregates role-based permissions and active JIT elevated permissions.
   */
  async getAdminPermissions(adminId: string): Promise<string[]> {
    const cacheKey = this.getPermCacheKey(adminId);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn(`Redis get failed for admin permissions: ${err}`);
    }

    // Query active permissions from roles + elevated grants
    const res = await this.db.query<{ permission_key: string }>(
      `SELECT DISTINCT CONCAT(p.resource, ':', p.action) AS permission_key
       FROM public.admin_role_assignments ara
       JOIN public.roles r ON r.id = ara.role_id
       JOIN public.role_permissions rp ON rp.role_id = r.id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE ara.admin_id = $1
         AND (ara.expires_at IS NULL OR ara.expires_at > NOW())
       UNION
       SELECT DISTINCT CONCAT(p.resource, ':', p.action) AS permission_key
       FROM public.elevated_access_grants eag
       JOIN public.permissions p ON p.id = eag.permission_id
       WHERE eag.admin_id = $1
         AND eag.is_revoked = false
         AND eag.starts_at <= NOW()
         AND eag.expires_at > NOW()
       UNION
       SELECT DISTINCT CONCAT(p.resource, ':', p.action) AS permission_key
       FROM public.elevated_access_grants eag
       JOIN public.roles r ON r.id = eag.role_id
       JOIN public.role_permissions rp ON rp.role_id = r.id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE eag.admin_id = $1
         AND eag.is_revoked = false
         AND eag.starts_at <= NOW()
         AND eag.expires_at > NOW()`,
      [adminId]
    );

    const permissions = res.rows.map((row) => row.permission_key);

    try {
      await this.redis.set(cacheKey, JSON.stringify(permissions), this.CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis set failed for admin permissions: ${err}`);
    }

    return permissions;
  }

  /**
   * Retrieves active assigned roles for an admin user.
   */
  async getAdminRoles(adminId: string): Promise<AdminRoleInfo[]> {
    const cacheKey = this.getRolesCacheKey(adminId);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn(`Redis get failed for admin roles: ${err}`);
    }

    const res = await this.db.query<AdminRoleInfo>(
      `SELECT r.id, r.name, r.slug, ara.scope_type, ara.scope_value, ara.expires_at
       FROM public.admin_role_assignments ara
       JOIN public.roles r ON r.id = ara.role_id
       WHERE ara.admin_id = $1
         AND (ara.expires_at IS NULL OR ara.expires_at > NOW())`,
      [adminId]
    );

    const roles = res.rows;

    try {
      await this.redis.set(cacheKey, JSON.stringify(roles), this.CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis set failed for admin roles: ${err}`);
    }

    return roles;
  }

  /**
   * Checks if an admin holds a specific permission.
   * Super Admins hold wildcard access for routine reads, but remain capped by four-eyes policies.
   */
  async hasPermission(adminId: string, requiredPermission: string): Promise<boolean> {
    const roles = await this.getAdminRoles(adminId);
    const isSuperAdmin = roles.some((r) => r.slug === 'super_admin');
    if (isSuperAdmin) {
      return true;
    }

    const permissions = await this.getAdminPermissions(adminId);
    return permissions.includes(requiredPermission);
  }

  /**
   * Invalidates cached permissions and roles for an admin (called on role assignment change or elevation).
   */
  async invalidateAdminPermissions(adminId: string): Promise<void> {
    const permKey = this.getPermCacheKey(adminId);
    const rolesKey = this.getRolesCacheKey(adminId);
    try {
      await this.redis.del(permKey);
      await this.redis.del(rolesKey);
    } catch (err) {
      this.logger.warn(`Failed to invalidate cache for admin ${adminId}: ${err}`);
    }
  }

  /**
   * Enforces Separation of Duties (SoD) rules across sensitive operational workflows.
   */
  assertSeparationOfDuties(params: {
    action: string;
    actorAdminId: string;
    requesterAdminId?: string;
    onboardedByAdminId?: string;
    creatorAdminId?: string;
  }): void {
    // 1. Self-approval rule: Requester cannot approve their own request
    if (params.requesterAdminId && params.actorAdminId === params.requesterAdminId) {
      throw new ForbiddenException(
        'Separation of Duties Violation: You cannot approve your own request.'
      );
    }

    // 2. Payout batch rule: Creator of payout batch cannot approve or execute dispatch
    if (params.creatorAdminId && params.actorAdminId === params.creatorAdminId) {
      throw new ForbiddenException(
        'Separation of Duties Violation: Creator of a payout batch cannot approve or execute its dispatch.'
      );
    }

    // 3. Seller onboarding vs bank detail change rule:
    // The admin who onboarded/reviewed the seller cannot approve subsequent bank detail alterations.
    if (params.onboardedByAdminId && params.actorAdminId === params.onboardedByAdminId) {
      throw new ForbiddenException(
        'Separation of Duties Violation: Admin who originally onboarded this seller is prohibited from approving seller bank detail modifications.'
      );
    }
  }
}
