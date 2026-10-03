import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AdminRedisService } from '../redis/admin-redis.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { RbacService } from '../rbac/rbac.service';
import { AdminAuthService } from '../auth/admin-auth.service';
import { KmsEncryptionService, EncryptedField } from './kms-encryption.service';

export interface RevealPiiRequest {
  adminId: string;
  resourceType: string;
  resourceId: string;
  fieldName: string;
  encryptedData?: EncryptedField;
  rawMaskedValue?: string;
  reason: string;
  stepUpToken: string;
  clientIp?: string;
  userAgent?: string;
}

@Injectable()
export class PiiRevealService {
  private readonly logger = new Logger(PiiRevealService.name);
  private readonly HOURLY_RATE_LIMIT = 10; // max 10 reveals per hour per admin

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: AdminRedisService,
    private readonly rbacService: RbacService,
    private readonly adminAuthService: AdminAuthService,
    private readonly auditService: AdminAuditService,
    private readonly kmsService: KmsEncryptionService,
  ) {}

  /**
   * Reveals sensitive PII on demand.
   * SECURITY INVARIANTS:
   * 1. Requires permission 'pii:reveal'.
   * 2. EXPLICITLY BLOCKS role 'support_engineer' (Support Engineer role can NEVER reveal production PII).
   * 3. Requires valid reason and step-up passkey verification.
   * 4. Enforces per-admin hourly rate limit in Redis.
   * 5. Produces an immutable sensitive-read audit log entry.
   */
  async revealPii(input: RevealPiiRequest): Promise<{ plaintext: string }> {
    // 1. Check roles: Support Engineer is strictly prohibited from revealing PII
    const roles = await this.rbacService.getAdminRoles(input.adminId);
    const roleSlugs = roles.map((r) => r.slug);

    if (roleSlugs.includes('support_engineer')) {
      await this.auditService.logEvent({
        actor_admin_id: input.adminId,
        actor_role_at_time: 'support_engineer',
        action: 'pii:reveal_attempt',
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        outcome: 'denied',
        reason: 'Security Invariant: Support Engineer role is strictly prohibited from revealing PII.',
        ip_address: input.clientIp,
        user_agent: input.userAgent,
      });

      throw new ForbiddenException(
        'Access Denied: Support Engineer role is strictly prohibited from revealing production PII.'
      );
    }

    // 2. Check permission
    const hasPerm = await this.rbacService.hasPermission(input.adminId, 'pii:reveal');
    if (!hasPerm) {
      throw new ForbiddenException('Missing required permission [pii:reveal].');
    }

    // 3. Reason requirement
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException('A valid, detailed justification reason (minimum 10 characters) is required to reveal PII.');
    }

    // 4. Verify step-up re-authentication
    const isStepUpValid = await this.adminAuthService.validateStepUpToken(input.stepUpToken);
    if (!isStepUpValid) {
      throw new UnauthorizedException('Fresh step-up passkey verification required to reveal PII.');
    }

    // 5. Rate limiting per admin
    const rateLimitKey = `admin:rate:pii_reveal:${input.adminId}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await this.redis.expire(rateLimitKey, 3600); // 1 hour window
    }

    if (currentCount > this.HOURLY_RATE_LIMIT) {
      await this.auditService.logEvent({
        actor_admin_id: input.adminId,
        actor_role_at_time: roleSlugs[0] || 'admin',
        action: 'pii:reveal_rate_limited',
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        outcome: 'denied',
        reason: `Exceeded hourly PII reveal threshold of ${this.HOURLY_RATE_LIMIT}.`,
        ip_address: input.clientIp,
        user_agent: input.userAgent,
      });

      throw new ForbiddenException(
        `PII reveal rate limit exceeded. Maximum ${this.HOURLY_RATE_LIMIT} reveals per hour allowed.`
      );
    }

    // 6. Decrypt field if encrypted, or return decrypted demonstration
    let plaintext = '';
    if (input.encryptedData) {
      plaintext = await this.kmsService.decrypt(input.encryptedData);
    } else {
      plaintext = `[REVEALED_${input.fieldName.toUpperCase()}_VALUE]`;
    }

    // 7. Produce immutable sensitive read audit log
    await this.auditService.logSensitiveRead({
      actor_admin_id: input.adminId,
      actor_role_at_time: roleSlugs[0] || 'admin',
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      reason: `Field [${input.fieldName}]: ${input.reason}`,
      ip_address: input.clientIp,
      user_agent: input.userAgent,
    });

    return { plaintext };
  }

  /**
   * Watermarks a PII export with the exporting admin's ID, timestamp, and audit reference.
   */
  watermarkPiiExport(csvContent: string, adminId: string): string {
    const timestamp = new Date().toISOString();
    const watermarkBanner = `# CONFIDENTIAL - EXPORTED BY ADMIN ${adminId} AT ${timestamp} - UNAUTHORIZED DISTRIBUTION PROHIBITED\n`;
    return watermarkBanner + csvContent;
  }
}
